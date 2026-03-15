from flask import Blueprint, jsonify, current_app
from backend.models.database import get_db

menu_bp = Blueprint('menu', __name__)

@menu_bp.route('/menu')
def get_menu():
    db = get_db(current_app)
    try:
        items = db.execute("SELECT * FROM menu_items WHERE availability=1 ORDER BY is_popular DESC, item_id").fetchall()
        return jsonify([dict(i) for i in items])
    finally: db.close()

@menu_bp.route('/menu/<category>')
def get_by_cat(category):
    db = get_db(current_app)
    try:
        items = db.execute("SELECT * FROM menu_items WHERE category=? AND availability=1", (category,)).fetchall()
        return jsonify([dict(i) for i in items])
    finally: db.close()
