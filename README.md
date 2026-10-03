# DevOps Task API

A small **Flask + PostgreSQL REST API** (task manager), built as a DevOps portfolio project.
It is designed to be deployed by a **Jenkins CI/CD pipeline** triggered by a GitHub webhook.

```
GitHub push --webhook--> Jenkins --> lint --> pytest --> docker build --> Docker Hub --> SSH deploy --> EC2 (Docker Compose: API + PostgreSQL)
```

## Tech stack
Python 3.12, Flask, SQLAlchemy, PostgreSQL 16, Gunicorn, Docker, Docker Compose, Jenkins, AWS EC2

## API endpoints

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/`                   | Service info                         |
| GET    | `/health`             | Health check (also tests DB)         |
| GET    | `/api/tasks`          | List tasks (`?status=pending\|in_progress\|done`) |
| POST   | `/api/tasks`          | Create task `{"title": "...", "description": "...", "status": "pending"}` |
| GET    | `/api/tasks/<id>`     | Get one task                         |
| PUT    | `/api/tasks/<id>`     | Update a task                        |
| DELETE | `/api/tasks/<id>`     | Delete a task                        |

## Run locally with Docker (recommended)

```bash
cp .env.example .env        # then edit the password
docker compose up --build -d
curl http://localhost:5000/health
```

Try it:

```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Jenkins","description":"Build my first pipeline"}'

curl http://localhost:5000/api/tasks
curl -X PUT http://localhost:5000/api/tasks/1 -H "Content-Type: application/json" -d '{"status":"done"}'
curl -X DELETE http://localhost:5000/api/tasks/1
```

Stop everything: `docker compose down` (add `-v` to delete the database volume).

## Run locally without Docker (SQLite)

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
python wsgi.py                 # uses SQLite when DATABASE_URL is not set
```

## Run tests and lint

```bash
pytest -v
flake8 app tests wsgi.py
```

## Deploy with Jenkins (extends your existing lab)

You already have Jenkins + GitHub webhook + Elastic IP. To reuse it:

1. **EC2 server**: install Docker and the Compose plugin
   (`sudo apt install docker.io docker-compose-v2 -y`, then `sudo usermod -aG docker ubuntu`).
   Open port **80** in the security group (and 22 for SSH).
2. **Jenkins server**: install Docker, Python3 + venv, and add the `jenkins` user to the docker group
   (`sudo usermod -aG docker jenkins`, then restart Jenkins).
3. **Jenkins credentials** (Manage Jenkins > Credentials):
   - `dockerhub-creds` (username/password)
   - `ec2-ssh-key` (SSH private key)
   - `ec2-host` (secret text, e.g. `ubuntu@<elastic-ip>`)
   - `db-env-file` (secret file: copy of your `.env` with a strong password)
4. Edit `IMAGE_NAME` in the `Jenkinsfile` with your Docker Hub username.
5. Create a **Multibranch Pipeline** (or Pipeline from SCM) pointing at your GitHub repo and keep the
   GitHub webhook (`http://<jenkins-ip>:8080/github-webhook/`).
6. Push to `main` and watch the pipeline run. Then open `http://<elastic-ip>/health`.

## Project structure

```
app/                  Flask application (models, routes, app factory)
tests/                pytest unit tests
scripts/deploy.sh     Deployment script run on EC2
Dockerfile            Production image (non-root, gunicorn, healthcheck)
docker-compose.yml    Local dev: API + PostgreSQL
docker-compose.prod.yml  Server: pulls image from Docker Hub
Jenkinsfile           CI/CD pipeline
```

## Ideas to extend (great for your resume)
- Provision EC2 + security groups with **Terraform**
- Move the database to **Amazon RDS** and secrets to **AWS Secrets Manager**
- Add **Trivy** image scanning and **SonarQube** to the pipeline
- Add Prometheus metrics and a **Grafana** dashboard
- Deploy to **ECS/EKS** behind an Application Load Balancer

## Resume bullet (edit with your real numbers)
> Built and deployed a containerized Flask + PostgreSQL REST API using a Jenkins CI/CD pipeline
> (GitHub webhook, automated lint/tests, Docker image build, Docker Hub push, automated SSH deployment
> to AWS EC2), reducing deployment time from manual steps to a fully automated flow.
