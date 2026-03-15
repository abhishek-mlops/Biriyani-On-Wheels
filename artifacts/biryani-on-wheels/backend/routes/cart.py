from flask import Blueprint, request, jsonify, session, current_app
from backend.models.database import get_db

cart_bp = Blueprint('cart', __name__)

@cart_bp.route('/cart')
def get_cart():
    uid = session.get('user_id')
    if not uid: return jsonify({'error': 'Not logged in'}), 401
    db = get_db(current_app)
    try:
        items = db.execute("""
            SELECT c.cart_id, c.quantity, c.size, m.item_id, m.name,
                   m.price_half, m.price_full, m.image_url, m.filter_type,
                   CASE WHEN c.size='half' THEN m.price_half ELSE m.price_full END as unit_price,
                   CASE WHEN c.size='half' THEN m.price_half * c.quantity ELSE m.price_full * c.quantity END as subtotal
            FROM cart c JOIN menu_items m ON c.item_id=m.item_id WHERE c.user_id=?
        """, (uid,)).fetchall()
        cart_items = [dict(i) for i in items]
        total = sum(i['subtotal'] for i in cart_items if i['subtotal'])
        return jsonify({'items': cart_items, 'total': total})
    finally: db.close()

@cart_bp.route('/cart/add', methods=['POST'])
def add_to_cart():
    uid = session.get('user_id')
    if not uid: return jsonify({'error': 'Not logged in'}), 401
    d = request.get_json()
    item_id, qty, size = d.get('item_id'), d.get('quantity', 1), d.get('size', 'full')
    db = get_db(current_app)
    try:
        existing = db.execute("SELECT * FROM cart WHERE user_id=? AND item_id=? AND size=?", (uid, item_id, size)).fetchone()
        if existing:
            db.execute("UPDATE cart SET quantity=quantity+? WHERE cart_id=?", (qty, existing['cart_id']))
        else:
            db.execute("INSERT INTO cart (user_id, item_id, quantity, size) VALUES (?,?,?,?)", (uid, item_id, qty, size))
        db.commit()
        count = db.execute("SELECT SUM(quantity) as t FROM cart WHERE user_id=?", (uid,)).fetchone()['t']
        return jsonify({'success': True, 'cart_count': count or 0})
    finally: db.close()

@cart_bp.route('/cart/remove', methods=['POST'])
def remove():
    uid = session.get('user_id')
    if not uid: return jsonify({'error': 'Not logged in'}), 401
    db = get_db(current_app)
    try:
        db.execute("DELETE FROM cart WHERE cart_id=? AND user_id=?", (request.get_json().get('cart_id'), uid))
        db.commit(); return jsonify({'success': True})
    finally: db.close()

@cart_bp.route('/cart/update', methods=['POST'])
def update():
    uid = session.get('user_id')
    if not uid: return jsonify({'error': 'Not logged in'}), 401
    d = request.get_json()
    db = get_db(current_app)
    try:
        if d.get('quantity', 1) <= 0:
            db.execute("DELETE FROM cart WHERE cart_id=? AND user_id=?", (d['cart_id'], uid))
        else:
            db.execute("UPDATE cart SET quantity=? WHERE cart_id=? AND user_id=?", (d['quantity'], d['cart_id'], uid))
        db.commit(); return jsonify({'success': True})
    finally: db.close()

@cart_bp.route('/cart/count')
def count():
    uid = session.get('user_id')
    if not uid: return jsonify({'count': 0})
    db = get_db(current_app)
    try:
        c = db.execute("SELECT SUM(quantity) as t FROM cart WHERE user_id=?", (uid,)).fetchone()['t']
        return jsonify({'count': c or 0})
    finally: db.close()

@cart_bp.route('/cart/clear', methods=['POST'])
def clear():
    uid = session.get('user_id')
    if not uid: return jsonify({'error': 'Not logged in'}), 401
    db = get_db(current_app)
    try:
        db.execute("DELETE FROM cart WHERE user_id=?", (uid,)); db.commit()
        return jsonify({'success': True})
    finally: db.close()
