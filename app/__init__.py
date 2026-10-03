import os
import time

from flask import Flask
from sqlalchemy.exc import OperationalError

from .models import db


def create_app(config=None):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "sqlite:///tasks.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    if config:
        app.config.update(config)

    db.init_app(app)

    from .routes import bp

    app.register_blueprint(bp)

    # Create tables; retry a few times in case the DB container is still starting.
    with app.app_context():
        for attempt in range(10):
            try:
                db.create_all()
                break
            except OperationalError:
                if attempt == 9:
                    raise
                time.sleep(3)

    return app
