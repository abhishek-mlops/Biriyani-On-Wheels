from flask import Flask, render_template, session, redirect, url_for
from backend.models.database import init_db
from backend.routes.auth import auth_bp
from backend.routes.menu import menu_bp
from backend.routes.cart import cart_bp
from backend.routes.orders import orders_bp
from backend.routes.admin import admin_bp
import os

app = Flask(
    __name__,
    template_folder='frontend/templates',
    static_folder='frontend/static'
)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'bow_biryani_manipal_2024')
app.config['DATABASE'] = os.environ.get(
    'DATABASE_PATH', os.path.join(os.path.dirname(__file__), 'database/bow.db')
)
app.config['UPLOAD_FOLDER'] = os.environ.get(
    'UPLOAD_FOLDER', os.path.join(os.path.dirname(__file__), 'frontend/static/images/uploads')
)
app.config['ADMIN_USERNAME'] = os.environ.get('ADMIN_USERNAME', 'admin')
app.config['ADMIN_PASSWORD'] = os.environ.get('ADMIN_PASSWORD', 'admin123')
# Google Sign-In (set in environment for production): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID', '')
app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET', '')
_default_redirect = 'http://127.0.0.1:5000/auth/google/callback'
app.config['GOOGLE_REDIRECT_URI'] = os.environ.get('GOOGLE_REDIRECT_URI', _default_redirect)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

app.register_blueprint(auth_bp)
app.register_blueprint(menu_bp)
app.register_blueprint(cart_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(admin_bp)

@app.route('/')
def index(): return render_template('index.html')
@app.route('/menu-page')
def menu_page(): return render_template('menu.html')
@app.route('/cart-page')
def cart_page(): return render_template('cart.html')
@app.route('/checkout-page')
def checkout_page(): return render_template('checkout.html')
@app.route('/tracking-page')
def tracking_page(): return render_template('tracking.html')
@app.route('/auth-page')
def auth_page():
    gid = app.config.get('GOOGLE_CLIENT_ID', '').strip()
    gsec = app.config.get('GOOGLE_CLIENT_SECRET', '').strip()
    return render_template('auth.html', google_signin_enabled=bool(gid and gsec))
@app.route('/admin-dashboard')
def admin_dashboard():
    if not session.get('admin_id'):
        return redirect(url_for('auth_page'))
    return render_template('admin.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    with app.app_context():
        init_db(app)
    app.run(host='0.0.0.0', debug=False, port=port)
