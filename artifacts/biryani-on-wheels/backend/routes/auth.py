from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from backend.models.database import get_db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    d = request.get_json()
    if not all([d.get('name'), d.get('email'), d.get('password')]):
        return jsonify({'error': 'Missing required fields'}), 400
    db = get_db(current_app)
    try:
        db.execute("INSERT INTO users (name, email, phone, password_hash) VALUES (?,?,?,?)",
                   (d['name'], d['email'], d.get('phone',''), generate_password_hash(d['password'])))
        db.commit()
        user = db.execute("SELECT * FROM users WHERE email=?", (d['email'],)).fetchone()
        session['user_id'] = user['user_id']; session['user_name'] = user['name']
        return jsonify({'success': True, 'user': {'id': user['user_id'], 'name': user['name'], 'email': user['email']}})
    except:
        return jsonify({'error': 'Email already exists'}), 409
    finally: db.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    d = request.get_json()
    db = get_db(current_app)
    try:
        user = db.execute("SELECT * FROM users WHERE email=?", (d.get('email'),)).fetchone()
        if user and check_password_hash(user['password_hash'], d.get('password','')):
            session['user_id'] = user['user_id']; session['user_name'] = user['name']
            return jsonify({'success': True, 'user': {'id': user['user_id'], 'name': user['name'], 'points': user['loyalty_points']}})
        return jsonify({'error': 'Invalid credentials'}), 401
    finally: db.close()

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear(); return jsonify({'success': True})

@auth_bp.route('/me')
def me():
    if 'user_id' not in session: return jsonify({'logged_in': False})
    db = get_db(current_app)
    try:
        user = db.execute("SELECT * FROM users WHERE user_id=?", (session['user_id'],)).fetchone()
        return jsonify({'logged_in': True, 'user': {'id': user['user_id'], 'name': user['name'], 'email': user['email'], 'points': user['loyalty_points']}}) if user else jsonify({'logged_in': False})
    finally: db.close()
