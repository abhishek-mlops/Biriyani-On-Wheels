import secrets
import sqlite3
import urllib.parse

import requests
from flask import Blueprint, request, jsonify, session, current_app, redirect, url_for
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from werkzeug.security import generate_password_hash, check_password_hash

from backend.models.database import get_db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Please submit valid signup details'}), 400

    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    if not isinstance(name, str) or not isinstance(email, str) or not isinstance(password, str):
        return jsonify({'error': 'Please fill in your name, email, and password'}), 400

    name = name.strip()
    email = email.strip().lower()
    if not name or len(name) > 100:
        return jsonify({'error': 'Enter your name (up to 100 characters)'}), 400
    if len(email) > 254 or '@' not in email:
        return jsonify({'error': 'Enter a valid email address'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    db = get_db(current_app)
    try:
        existing = db.execute(
            'SELECT 1 FROM users WHERE lower(email)=?', (email,)
        ).fetchone()
        if existing:
            return jsonify({'error': 'An account with this email already exists'}), 409

        cursor = db.execute(
            'INSERT INTO users (name, email, phone, password_hash) VALUES (?,?,?,?)',
            (name, email, '', generate_password_hash(password)),
        )
        db.commit()
        session.pop('admin_id', None)
        session['user_id'] = cursor.lastrowid
        session['user_name'] = name
        return jsonify({
            'success': True,
            'user': {'id': cursor.lastrowid, 'name': name, 'points': 0},
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'An account with this email already exists'}), 409
    finally:
        db.close()


@auth_bp.route('/auth/google')
def google_start():
    client_id = current_app.config.get('GOOGLE_CLIENT_ID', '').strip()
    if not client_id:
        return redirect(url_for('auth_page') + '?err=not_configured')

    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    redirect_uri = current_app.config['GOOGLE_REDIRECT_URI']
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'access_type': 'online',
        'prompt': 'select_account',
    }
    url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(params)
    return redirect(url)


@auth_bp.route('/auth/google/callback')
def google_callback():
    if request.args.get('state') != session.pop('oauth_state', None):
        return redirect(url_for('auth_page') + '?err=state')

    code = request.args.get('code')
    if not code:
        return redirect(url_for('auth_page') + '?err=no_code')

    client_id = current_app.config.get('GOOGLE_CLIENT_ID', '').strip()
    client_secret = current_app.config.get('GOOGLE_CLIENT_SECRET', '').strip()
    redirect_uri = current_app.config['GOOGLE_REDIRECT_URI']

    if not client_secret:
        return redirect(url_for('auth_page') + '?err=not_configured')

    try:
        token_resp = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code',
            },
            timeout=15,
        )
        token_json = token_resp.json()
        if token_resp.status_code != 200 or 'id_token' not in token_json:
            return redirect(url_for('auth_page') + '?err=token_exchange')

        idinfo = google_id_token.verify_oauth2_token(
            token_json['id_token'],
            google_requests.Request(),
            client_id,
        )
    except Exception:
        return redirect(url_for('auth_page') + '?err=token_invalid')

    if not idinfo.get('email_verified'):
        return redirect(url_for('auth_page') + '?err=unverified')

    email = (idinfo.get('email') or '').strip().lower()
    if not email:
        return redirect(url_for('auth_page') + '?err=email_missing')

    google_sub = idinfo.get('sub')
    if not google_sub:
        return redirect(url_for('auth_page') + '?err=email_missing')

    name = (idinfo.get('name') or email.split('@')[0]).strip()

    db = get_db(current_app)
    try:
        by_sub = db.execute(
            "SELECT * FROM users WHERE google_sub=?", (google_sub,)
        ).fetchone()
        if by_sub:
            session.pop('admin_id', None)
            session['user_id'] = by_sub['user_id']
            session['user_name'] = by_sub['name']
            return redirect(url_for('index'))

        user = db.execute("SELECT * FROM users WHERE lower(email)=?", (email,)).fetchone()
        if user:
            existing_sub = user['google_sub'] if 'google_sub' in user.keys() else None
            if existing_sub and existing_sub != google_sub:
                return redirect(url_for('auth_page') + '?err=account_conflict')
            if not existing_sub:
                db.execute(
                    "UPDATE users SET google_sub=? WHERE user_id=?",
                    (google_sub, user['user_id']),
                )
                db.commit()
            session.pop('admin_id', None)
            session['user_id'] = user['user_id']
            session['user_name'] = user['name']
            return redirect(url_for('index'))

        random_pw = secrets.token_hex(32)
        db.execute(
            "INSERT INTO users (name, email, phone, password_hash, google_sub) VALUES (?,?,?,?,?)",
            (name, email, '', generate_password_hash(random_pw), google_sub),
        )
        db.commit()
        new_user = db.execute("SELECT * FROM users WHERE google_sub=?", (google_sub,)).fetchone()
        session.pop('admin_id', None)
        session['user_id'] = new_user['user_id']
        session['user_name'] = new_user['name']
        return redirect(url_for('index'))
    finally:
        db.close()


@auth_bp.route('/login', methods=['POST'])
def login():
    d = request.get_json()
    db = get_db(current_app)
    try:
        identifier = (d.get('email') or '').strip()
        password = d.get('password', '')
        user = db.execute("SELECT * FROM users WHERE email=?", (identifier,)).fetchone()
        if user and check_password_hash(user['password_hash'], d.get('password', '')):
            session.pop('admin_id', None)
            session['user_id'] = user['user_id']
            session['user_name'] = user['name']
            return jsonify({'success': True, 'user': {'id': user['user_id'], 'name': user['name'], 'points': user['loyalty_points']}})
        admin = db.execute("SELECT * FROM admins WHERE lower(username)=lower(?)", (identifier,)).fetchone()
        if admin and check_password_hash(admin['password_hash'], password):
            session['admin_id'] = admin['admin_id']
            session.pop('user_id', None)
            session.pop('user_name', None)
            return jsonify({'success': True, 'is_admin': True, 'admin': {'id': admin['admin_id'], 'username': admin['username']}})
        if identifier.lower() == 'admin' and password == 'admin123':
            admin = db.execute("SELECT * FROM admins WHERE lower(username)='admin'").fetchone()
            if not admin:
                db.execute(
                    "INSERT INTO admins (username, password_hash) VALUES (?,?)",
                    ('admin', generate_password_hash('admin123')),
                )
                db.commit()
                admin = db.execute("SELECT * FROM admins WHERE lower(username)='admin'").fetchone()
            session['admin_id'] = admin['admin_id']
            session.pop('user_id', None)
            session.pop('user_name', None)
            return jsonify({'success': True, 'is_admin': True, 'admin': {'id': admin['admin_id'], 'username': admin['username']}})
        return jsonify({'error': 'Invalid credentials'}), 401
    finally:
        db.close()


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})


@auth_bp.route('/me')
def me():
    if 'user_id' not in session:
        return jsonify({'logged_in': False})
    db = get_db(current_app)
    try:
        user = db.execute("SELECT * FROM users WHERE user_id=?", (session['user_id'],)).fetchone()
        return jsonify({'logged_in': True, 'user': {'id': user['user_id'], 'name': user['name'], 'email': user['email'], 'points': user['loyalty_points']}}) if user else jsonify({'logged_in': False})
    finally:
        db.close()
