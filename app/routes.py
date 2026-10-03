from flask import Blueprint, jsonify, request
from sqlalchemy import text

from .models import VALID_STATUSES, Task, db

bp = Blueprint("api", __name__)


def error(message, code):
    return jsonify({"error": message}), code


@bp.get("/")
def index():
    return jsonify(
        {
            "service": "devops-task-api",
            "version": "1.0.0",
            "endpoints": ["/health", "/api/tasks"],
        }
    )


@bp.get("/health")
def health():
    """Used by Docker, load balancers and Jenkins to check the app + DB."""
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"status": "ok", "database": "up"}), 200
    except Exception:
        return jsonify({"status": "degraded", "database": "down"}), 503


@bp.get("/api/tasks")
def list_tasks():
    query = Task.query
    status = request.args.get("status")
    if status:
        if status not in VALID_STATUSES:
            return error(f"status must be one of {VALID_STATUSES}", 400)
        query = query.filter_by(status=status)
    tasks = query.order_by(Task.id).all()
    return jsonify([t.to_dict() for t in tasks])


@bp.post("/api/tasks")
def create_task():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return error("title is required", 400)
    if len(title) > 120:
        return error("title must be 120 characters or fewer", 400)
    status = data.get("status", "pending")
    if status not in VALID_STATUSES:
        return error(f"status must be one of {VALID_STATUSES}", 400)

    task = Task(title=title, description=data.get("description", ""), status=status)
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@bp.get("/api/tasks/<int:task_id>")
def get_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return error("task not found", 404)
    return jsonify(task.to_dict())


@bp.put("/api/tasks/<int:task_id>")
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return error("task not found", 404)

    data = request.get_json(silent=True) or {}
    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            return error("title cannot be empty", 400)
        task.title = title
    if "description" in data:
        task.description = data["description"]
    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            return error(f"status must be one of {VALID_STATUSES}", 400)
        task.status = data["status"]

    db.session.commit()
    return jsonify(task.to_dict())


@bp.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return error("task not found", 404)
    db.session.delete(task)
    db.session.commit()
    return "", 204
