import sqlite3, os

def get_db(app):
    db_path = app.config['DATABASE']
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(app):
    conn = get_db(app)
    c = conn.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            phone TEXT, password_hash TEXT NOT NULL,
            loyalty_points INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS menu_items (
            item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, category TEXT NOT NULL,
            description TEXT, price_half REAL, price_full REAL,
            image_url TEXT, availability INTEGER DEFAULT 1,
            is_popular INTEGER DEFAULT 0, is_chef_special INTEGER DEFAULT 0,
            filter_type TEXT DEFAULT 'none', badge TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS orders (
            order_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER, total_price REAL NOT NULL,
            order_status TEXT DEFAULT 'Order Received',
            payment_method TEXT, delivery_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );
        CREATE TABLE IF NOT EXISTS order_items (
            order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER, item_id INTEGER,
            quantity INTEGER NOT NULL, price REAL NOT NULL, size TEXT DEFAULT 'full',
            FOREIGN KEY (order_id) REFERENCES orders(order_id),
            FOREIGN KEY (item_id) REFERENCES menu_items(item_id)
        );
        CREATE TABLE IF NOT EXISTS cart (
            cart_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER, item_id INTEGER,
            quantity INTEGER DEFAULT 1, size TEXT DEFAULT 'full',
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (item_id) REFERENCES menu_items(item_id)
        );
        CREATE TABLE IF NOT EXISTS admins (
            admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL
        );
    ''')

    from werkzeug.security import generate_password_hash
    c.execute("SELECT * FROM admins WHERE username='admin'")
    if not c.fetchone():
        c.execute("INSERT INTO admins (username, password_hash) VALUES (?,?)",
                  ('admin', generate_password_hash('admin123')))

    c.execute("SELECT COUNT(*) FROM menu_items")
    if c.fetchone()[0] == 0:
        # REAL Biryani on Wheels menu from the poster
        items = [
            # Coastal Delicacy
            ('Neer Dose & Chicken Curry', 'Coastal Delicacy',
             'Soft, lacy rice crepes (3 pcs) served with rich coastal chicken curry — a Tulu Nadu classic',
             50, None, '/static/images/neer_dose.jpg', 1, 1, 0, 'pearl', '🌟 Bestseller'),
            ('Idli & Chicken Curry', 'Coastal Delicacy',
             'Fluffy steamed idlis (3 pcs) paired with our signature spicy chicken curry',
             50, None, '/static/images/kushka.jpg', 1, 0, 0, 'steam', ''),
            ('Chapati & Chicken Curry', 'Coastal Delicacy',
             'Soft whole-wheat chapatis (3 pcs) with flavourful chicken gravy',
             50, None, '/static/images/neer_dose.jpg', 1, 0, 0, 'golden', ''),
            ('Pundi Gasi', 'Coastal Delicacy',
             'Traditional rice dumplings (3 pcs) — Coastal Karnataka comfort food',
             50, None, '/static/images/kushka.jpg', 1, 0, 1, 'pearl', '👨‍🍳 Chef Special'),
            ('Parota & Chicken Curry', 'Coastal Delicacy',
             'Flaky, layered Kerala-style parotas (2 pcs) with thick chicken curry',
             50, None, '/static/images/neer_dose.jpg', 1, 1, 0, 'golden', '🔥 Popular'),
            ('Ottu Semige & Chicken Curry', 'Coastal Delicacy',
             'String hoppers (2 pcs) with coastal-style chicken curry',
             50, None, '/static/images/kushka.jpg', 1, 0, 0, 'steam', ''),
            ('Kori Rotti', 'Coastal Delicacy',
             'Crispy rice wafers served with authentic Mangalorean chicken curry — pure nostalgia',
             50, None, '/static/images/neer_dose.jpg', 1, 1, 1, 'crispy', '🏆 Signature'),

            # Naati Style Biryani
            ('Naati Chicken Donne Biryani', 'Naati Biryani',
             'Aromatic seeraga samba rice cooked with farm-fresh naati chicken, served in a fragrant dome on banana leaf',
             80, 120, '/static/images/chicken_biryani.jpg', 1, 1, 1, 'flame', '🔥 #1 Most Ordered'),
            ('Egg Donne Biryani', 'Naati Biryani',
             'Fluffy seeraga samba biryani with perfectly boiled eggs, raita & spicy gravy',
             70, 110, '/static/images/egg_biryani.jpg', 1, 1, 0, 'saffron', '⭐ Fan Favourite'),
            ('Kushka (Plain Donne Biryani)', 'Naati Biryani',
             'Pure biryani rice cooked in spices, served with gravy & raita — minimalist perfection',
             50, 80, '/static/images/kushka.jpg', 1, 0, 0, 'golden', ''),
            ('Mutton Donne Biryani', 'Naati Biryani',
             'Slow-cooked tender mutton pieces layered in fragrant biryani rice, slow-dum style',
             None, 150, '/static/images/mutton_biryani.jpg', 1, 1, 1, 'royal', '👑 Premium'),

            # Chicken Fry
            ('Chicken Kabab', 'Chicken Fry',
             'Juicy whole chicken pieces marinated in secret spice blend, deep fried to perfection',
             80, 120, '/static/images/chicken_kabab.jpg', 1, 1, 0, 'flame', '🔥 Bestseller'),
            ('Chicken Tawa Kabab', 'Chicken Fry',
             'Smoky tawa-grilled chicken with curry leaves — crispy outside, juicy inside',
             None, 180, '/static/images/tawa_kabab.jpg', 1, 1, 1, 'smoky', '👨‍🍳 Chef Special'),

            # Fast Food
            ('Egg Fried Rice', 'Fast Food',
             'Wok-tossed rice with eggs, veggies & soy sauce — Indo-Chinese street style',
             50, 80, '/static/images/egg_biryani.jpg', 1, 0, 0, 'wok', ''),
            ('Chicken Fried Rice', 'Fast Food',
             'Fragrant fried rice loaded with chicken pieces & spring onions',
             70, 110, '/static/images/chicken_biryani.jpg', 1, 1, 0, 'wok', '🔥 Popular'),
            ('Veg Fried Rice', 'Fast Food',
             'Colourful mixed vegetables tossed in aromatic rice',
             None, 60, '/static/images/kushka.jpg', 1, 0, 0, 'fresh', ''),
            ('Egg Noodles', 'Fast Food',
             'Stir-fried noodles with eggs and veggies in spicy sauce',
             50, 80, '/static/images/egg_dosa.jpg', 1, 0, 0, 'wok', ''),
            ('Chicken Noodles', 'Fast Food',
             'Loaded chicken noodles with crunchy vegetables',
             70, 110, '/static/images/egg_dosa.jpg', 1, 0, 0, 'wok', ''),

            # Egg Items
            ('Boiled Egg', 'Egg Items',
             'Simple perfectly boiled eggs — 2 pieces',
             None, 30, '/static/images/egg_biryani.jpg', 1, 0, 0, 'none', ''),
            ('Half Boiled Egg', 'Egg Items',
             'Silky half-boiled eggs — 2 pieces',
             None, 30, '/static/images/egg_biryani.jpg', 1, 0, 0, 'none', ''),
            ('Egg Omelette', 'Egg Items',
             'Fluffy masala omelette — 2 eggs',
             None, 50, '/static/images/egg_dosa.jpg', 1, 0, 0, 'golden', ''),
            ('Egg Burji', 'Egg Items',
             'Spiced scrambled eggs with onion & tomato — 2 eggs',
             None, 60, '/static/images/egg_dosa.jpg', 1, 1, 0, 'flame', '🔥 Popular'),
            ('Egg Bread Omelette', 'Egg Items',
             'Egg omelette stuffed in bread — 2 eggs',
             None, 60, '/static/images/egg_dosa.jpg', 1, 0, 0, 'crispy', ''),
            ('Egg Bread Masala', 'Egg Items',
             'Masala egg with bread, our breakfast classic — 2 eggs',
             None, 60, '/static/images/egg_dosa.jpg', 1, 0, 1, 'golden', '👨‍🍳 Chef Special'),
        ]
        c.executemany('''
            INSERT INTO menu_items 
            (name, category, description, price_half, price_full, image_url, 
             availability, is_popular, is_chef_special, filter_type, badge)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ''', items)

    conn.commit()
    conn.close()
    print("✅ Biryani on Wheels DB initialized")
