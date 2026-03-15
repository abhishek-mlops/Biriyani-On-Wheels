from flask import Flask, render_template, session
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
app.config['SECRET_KEY'] = 'bow_biryani_manipal_2024'
app.config['DATABASE'] = os.path.join(os.path.dirname(__file__), 'database/bow.db')
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'frontend/static/images/uploads')
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
def auth_page(): return render_template('auth.html')
@app.route('/admin-dashboard')
def admin_dashboard(): return render_template('admin.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    with app.app_context():
        init_db(app)
    app.run(host='0.0.0.0', debug=False, port=port)
