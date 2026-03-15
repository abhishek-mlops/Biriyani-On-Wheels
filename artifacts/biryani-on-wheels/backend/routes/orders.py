from flask import Blueprint, request, jsonify, session, current_app
from backend.models.database import get_db
from datetime import datetime

orders_bp = Blueprint('orders', __name__)

def is_open():
    now = datetime.now()
    t = now.hour * 60 + now.minute
    return 17 * 60 <= t <= 24 * 60  # 5 PM to midnight

@orders_bp.route('/restaurant/status')
def status():
    return jsonify({'is_open': is_open(), 'current_time': datetime.now().strftime('%I:%M %p'), 'opens_at': '5:00 PM', 'closes_at': '12:00 AM'})

@orders_bp.route('/order', methods=['POST'])
def place_order():
    uid = session.get('user_id')
    if not uid: return jsonify({'error': 'Not logged in'}), 401
    if not is_open(): return jsonify({'error': 'We are closed! Open 5 PM – 12 AM daily (Mon holiday).'}), 403
    d = request.get_json()
    db = get_db(current_app)
    try:
        cart = db.execute("""
            SELECT c.item_id, c.quantity, c.size,
                   CASE WHEN c.size='half' THEN m.price_half ELSE m.price_full END as price
            FROM cart c JOIN menu_items m ON c.item_id=m.item_id WHERE c.user_id=?
        """, (uid,)).fetchall()
        if not cart: return jsonify({'error': 'Cart is empty'}), 400
        total = sum(i['price'] * i['quantity'] for i in cart if i['price'])
        cur = db.execute("INSERT INTO orders (user_id, total_price, payment_method, delivery_address) VALUES (?,?,?,?)",
                         (uid, total, d.get('payment_method','Cash on Delivery'), d.get('delivery_address','')))
        oid = cur.lastrowid
        for item in cart:
            db.execute("INSERT INTO order_items (order_id, item_id, quantity, price, size) VALUES (?,?,?,?,?)",
                       (oid, item['item_id'], item['quantity'], item['price'], item['size']))
        points = int(total / 10)
        db.execute("UPDATE users SET loyalty_points=loyalty_points+? WHERE user_id=?", (points, uid))
        db.execute("DELETE FROM cart WHERE user_id=?", (uid,))
        db.commit()
        return jsonify({'success': True, 'order_id': oid, 'total': total, 'points_earned': points})
    finally: db.close()

@orders_bp.route('/orders')
def get_orders():
    uid = session.get('user_id')
    if not uid: return jsonify({'error': 'Not logged in'}), 401
    db = get_db(current_app)
    try:
        orders = db.execute("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC", (uid,)).fetchall()
        result = []
        for o in orders:
            od = dict(o)
            od['items'] = [dict(i) for i in db.execute("""
                SELECT oi.quantity, oi.price, oi.size, m.name, m.image_url
                FROM order_items oi JOIN menu_items m ON oi.item_id=m.item_id WHERE oi.order_id=?
            """, (o['order_id'],)).fetchall()]
            result.append(od)
        return jsonify(result)
    finally: db.close()

@orders_bp.route('/order/<int:oid>')
def get_order(oid):
    uid = session.get('user_id')
    if not uid: return jsonify({'error': 'Not logged in'}), 401
    db = get_db(current_app)
    try:
        o = db.execute("SELECT * FROM orders WHERE order_id=? AND user_id=?", (oid, uid)).fetchone()
        if not o: return jsonify({'error': 'Not found'}), 404
        od = dict(o)
        od['items'] = [dict(i) for i in db.execute("""
            SELECT oi.quantity, oi.price, oi.size, m.name, m.image_url
            FROM order_items oi JOIN menu_items m ON oi.item_id=m.item_id WHERE oi.order_id=?
        """, (oid,)).fetchall()]
        return jsonify(od)
    finally: db.close()

@orders_bp.route('/order/reorder/<int:oid>', methods=['POST'])
def reorder(oid):
    uid = session.get('user_id')
    if not uid: return jsonify({'error': 'Not logged in'}), 401
    db = get_db(current_app)
    try:
        items = db.execute("SELECT * FROM order_items WHERE order_id=?", (oid,)).fetchall()
        for item in items:
            ex = db.execute("SELECT * FROM cart WHERE user_id=? AND item_id=? AND size=?", (uid, item['item_id'], item['size'])).fetchone()
            if ex:
                db.execute("UPDATE cart SET quantity=quantity+? WHERE cart_id=?", (item['quantity'], ex['cart_id']))
            else:
                db.execute("INSERT INTO cart (user_id, item_id, quantity, size) VALUES (?,?,?,?)", (uid, item['item_id'], item['quantity'], item['size']))
        db.commit(); return jsonify({'success': True})
    finally: db.close()
