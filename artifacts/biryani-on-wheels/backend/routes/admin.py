from flask import Blueprint, request, jsonify, session, current_app
from backend.models.database import get_db

admin_bp = Blueprint('admin', __name__)

def req_admin(): return bool(session.get('admin_id'))

@admin_bp.route('/admin/logout', methods=['POST'])
def logout():
    session.pop('admin_id', None); return jsonify({'success': True})

@admin_bp.route('/admin/dashboard')
def dashboard():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    db = get_db(current_app)
    try:
        total_orders = db.execute("SELECT COUNT(*) as c FROM orders").fetchone()['c']
        revenue = db.execute("SELECT COALESCE(SUM(total_price),0) as r FROM orders WHERE DATE(created_at)=DATE('now')").fetchone()['r']
        customers = db.execute("SELECT COUNT(*) as c FROM users").fetchone()['c']
        popular = db.execute("""SELECT m.name, SUM(oi.quantity) as total FROM order_items oi
            JOIN menu_items m ON oi.item_id=m.item_id GROUP BY oi.item_id ORDER BY total DESC LIMIT 5""").fetchall()
        recent = db.execute("""SELECT o.*, u.name as cname FROM orders o
            LEFT JOIN users u ON o.user_id=u.user_id ORDER BY o.created_at DESC LIMIT 10""").fetchall()
        return jsonify({'total_orders': total_orders, 'daily_revenue': revenue, 'total_customers': customers,
                        'popular': [dict(p) for p in popular], 'recent': [dict(r) for r in recent]})
    finally: db.close()

@admin_bp.route('/admin/orders')
def orders():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    db = get_db(current_app)
    try:
        rows = db.execute("""SELECT o.*, u.name as cname FROM orders o
            LEFT JOIN users u ON o.user_id=u.user_id ORDER BY o.created_at DESC""").fetchall()
        result = []
        for r in rows:
            rd = dict(r)
            rd['items'] = [dict(i) for i in db.execute("""SELECT oi.quantity,oi.size,m.name FROM order_items oi
                JOIN menu_items m ON oi.item_id=m.item_id WHERE oi.order_id=?""", (r['order_id'],)).fetchall()]
            result.append(rd)
        return jsonify(result)
    finally: db.close()

@admin_bp.route('/admin/order-status', methods=['PUT'])
def update_status():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    d = request.get_json()
    db = get_db(current_app)
    try:
        db.execute("UPDATE orders SET order_status=? WHERE order_id=?", (d['status'], d['order_id']))
        db.commit(); return jsonify({'success': True})
    finally: db.close()

@admin_bp.route('/admin/add-menu-item', methods=['POST'])
def add_item():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    d = request.get_json()
    db = get_db(current_app)
    try:
        db.execute("""INSERT INTO menu_items (name,category,description,price_half,price_full,image_url,
            availability,is_popular,is_chef_special,filter_type,badge) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (d['name'],d['category'],d.get('description',''),d.get('price_half'),d.get('price_full'),
             d.get('image_url',''),d.get('availability',1),d.get('is_popular',0),d.get('is_chef_special',0),
             d.get('filter_type','none'),d.get('badge','')))
        db.commit(); return jsonify({'success': True})
    finally: db.close()

@admin_bp.route('/admin/edit-menu-item', methods=['PUT'])
def edit_item():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    d = request.get_json()
    db = get_db(current_app)
    try:
        db.execute("""UPDATE menu_items SET name=?,category=?,description=?,price_half=?,price_full=?,
            image_url=?,availability=?,is_popular=?,is_chef_special=?,filter_type=?,badge=? WHERE item_id=?""",
            (d['name'],d['category'],d.get('description',''),d.get('price_half'),d.get('price_full'),
             d.get('image_url',''),d.get('availability',1),d.get('is_popular',0),d.get('is_chef_special',0),
             d.get('filter_type','none'),d.get('badge',''),d['item_id']))
        db.commit(); return jsonify({'success': True})
    finally: db.close()

@admin_bp.route('/admin/delete-menu-item', methods=['DELETE'])
def del_item():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    db = get_db(current_app)
    try:
        db.execute("DELETE FROM menu_items WHERE item_id=?", (request.args.get('item_id'),))
        db.commit(); return jsonify({'success': True})
    finally: db.close()

@admin_bp.route('/admin/analytics')
def analytics():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    db = get_db(current_app)
    try:
        daily = db.execute("""SELECT DATE(created_at) as date, SUM(total_price) as revenue, COUNT(*) as orders
            FROM orders GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 7""").fetchall()
        top = db.execute("""SELECT m.name, m.category, SUM(oi.quantity) as total FROM order_items oi
            JOIN menu_items m ON oi.item_id=m.item_id GROUP BY oi.item_id ORDER BY total DESC LIMIT 10""").fetchall()
        return jsonify({'daily_sales': [dict(d) for d in daily], 'top_dishes': [dict(d) for d in top]})
    finally: db.close()

@admin_bp.route('/admin/payment-settings')
def get_payment_settings():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    db = get_db(current_app)
    try:
        s = db.execute("""SELECT upi_id, bank_name, account_holder, account_number, ifsc_code, updated_at
                          FROM payment_settings WHERE setting_id=1""").fetchone()
        if not s:
            return jsonify({'upi_id': '', 'bank_name': '', 'account_holder': '', 'account_number': '', 'ifsc_code': '', 'updated_at': None})
        return jsonify(dict(s))
    finally:
        db.close()

@admin_bp.route('/admin/payment-settings', methods=['PUT'])
def update_payment_settings():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    d = request.get_json()
    db = get_db(current_app)
    try:
        db.execute("""UPDATE payment_settings
                      SET upi_id=?, bank_name=?, account_holder=?, account_number=?, ifsc_code=?,
                          updated_at=CURRENT_TIMESTAMP
                      WHERE setting_id=1""",
                   (d.get('upi_id','').strip(), d.get('bank_name','').strip(), d.get('account_holder','').strip(),
                    d.get('account_number','').strip(), d.get('ifsc_code','').strip()))
        db.commit()
        return jsonify({'success': True})
    finally:
        db.close()

@admin_bp.route('/admin/payment-notifications')
def payment_notifications():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    db = get_db(current_app)
    try:
        rows = db.execute("""SELECT notification_id, title, message, order_id, amount, payment_method, is_read, created_at
                             FROM admin_notifications ORDER BY created_at DESC LIMIT 50""").fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        db.close()

@admin_bp.route('/admin/payment-notifications/read', methods=['PUT'])
def mark_notifications_read():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    db = get_db(current_app)
    try:
        db.execute("UPDATE admin_notifications SET is_read=1 WHERE is_read=0")
        db.commit()
        return jsonify({'success': True})
    finally:
        db.close()

@admin_bp.route('/admin/poster-settings')
def get_poster_settings_admin():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    db = get_db(current_app)
    try:
        s = db.execute("""SELECT template_name, heading, subheading, cta_text, sticker, image_url, updated_at
                          FROM poster_settings WHERE setting_id=1""").fetchone()
        if s:
            return jsonify(dict(s))
        return jsonify({'error': 'Poster settings missing'}), 404
    finally:
        db.close()

@admin_bp.route('/admin/poster-settings', methods=['PUT'])
def update_poster_settings():
    if not req_admin(): return jsonify({'error': 'Unauthorized'}), 403
    d = request.get_json()
    db = get_db(current_app)
    try:
        db.execute("""UPDATE poster_settings
                      SET template_name=?, heading=?, subheading=?, cta_text=?, sticker=?, image_url=?, updated_at=CURRENT_TIMESTAMP
                      WHERE setting_id=1""",
                   (d.get('template_name', 'classic').strip(), d.get('heading', '').strip(),
                    d.get('subheading', '').strip(), d.get('cta_text', 'Order Now').strip(),
                    d.get('sticker', 'none').strip(), d.get('image_url', '/static/images/menu_poster.jpg').strip()))
        db.commit()
        return jsonify({'success': True})
    finally:
        db.close()

@admin_bp.route('/poster-settings')
def get_poster_settings_public():
    db = get_db(current_app)
    try:
        s = db.execute("""SELECT template_name, heading, subheading, cta_text, sticker, image_url
                          FROM poster_settings WHERE setting_id=1""").fetchone()
        if s:
            return jsonify(dict(s))
        return jsonify({'error': 'Poster settings missing'}), 404
    finally:
        db.close()
