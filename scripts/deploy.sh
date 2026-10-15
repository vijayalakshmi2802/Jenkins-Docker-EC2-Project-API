
#!/usr/bin/env bash
# Deploys the Task Manager API and frontend on EC2.
set -euo pipefail

: "${IMAGE:?IMAGE variable is required}"
: "${FRONTEND_IMAGE:?FRONTEND_IMAGE variable is required}"

export IMAGE
export FRONTEND_IMAGE

echo "Pulling backend and frontend images..."
docker compose pull api frontend

echo "Starting services..."
docker compose up -d

echo "Waiting for API health check..."
for i in $(seq 1 20); do
    if curl -fsS http://localhost/health > /dev/null; then
        echo "API deployment healthy: $IMAGE"
        break
    fi

    if [ "$i" -eq 20 ]; then
        echo "API health check failed." >&2
        docker compose logs --tail=50 api db frontend
        exit 1
    fi

    sleep 3
done

echo "Checking frontend response..."
if ! curl -fsS http://localhost:8081/ > /dev/null; then
    echo "Frontend health check failed." >&2
    docker compose logs --tail=50 frontend
    exit 1
fi

echo "Frontend deployment healthy: $FRONTEND_IMAGE"

docker image prune -f

echo "Deployment completed successfully."
