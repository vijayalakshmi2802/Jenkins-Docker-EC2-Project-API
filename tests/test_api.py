import pytest

from app import create_app
from app.models import db


@pytest.fixture()
def client():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json()["database"] == "up"


def test_create_and_get_task(client):
    res = client.post("/api/tasks", json={"title": "Write Jenkinsfile"})
    assert res.status_code == 201
    task_id = res.get_json()["id"]

    res = client.get(f"/api/tasks/{task_id}")
    assert res.status_code == 200
    assert res.get_json()["title"] == "Write Jenkinsfile"
    assert res.get_json()["status"] == "pending"


def test_create_requires_title(client):
    res = client.post("/api/tasks", json={"description": "no title"})
    assert res.status_code == 400


def test_list_and_filter(client):
    client.post("/api/tasks", json={"title": "A", "status": "done"})
    client.post("/api/tasks", json={"title": "B"})
    assert len(client.get("/api/tasks").get_json()) == 2
    done = client.get("/api/tasks?status=done").get_json()
    assert len(done) == 1 and done[0]["title"] == "A"
    assert client.get("/api/tasks?status=bogus").status_code == 400


def test_update_task(client):
    task_id = client.post("/api/tasks", json={"title": "Old"}).get_json()["id"]
    res = client.put(f"/api/tasks/{task_id}", json={"title": "New", "status": "in_progress"})
    assert res.status_code == 200
    assert res.get_json()["title"] == "New"
    assert res.get_json()["status"] == "in_progress"


def test_delete_task(client):
    task_id = client.post("/api/tasks", json={"title": "Temp"}).get_json()["id"]
    assert client.delete(f"/api/tasks/{task_id}").status_code == 204
    assert client.get(f"/api/tasks/{task_id}").status_code == 404


def test_not_found(client):
    assert client.get("/api/tasks/999").status_code == 404
    assert client.put("/api/tasks/999", json={"title": "x"}).status_code == 404
    assert client.delete("/api/tasks/999").status_code == 404
