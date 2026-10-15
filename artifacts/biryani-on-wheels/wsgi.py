from app import app
from backend.models.database import init_db

with app.app_context():
    init_db(app)
