#!/usr/bin/env bash
# Runs on the EC2 server. Usage: IMAGE=user/devops-task-api:12 bash deploy.sh
set -euo pipefail

: "${IMAGE:?IMAGE variable is required}"
export IMAGE

docker compose pull api
docker compose up -d

echo "Waiting for health check..."
for i in $(seq 1 20); do
  if curl -fs http://localhost/health > /dev/null; then
    echo "Deployment healthy: $IMAGE"
    docker image prune -f
    exit 0
  fi
  sleep 3
done

echo "Health check failed after deploy" >&2
docker compose logs --tail=50 api
exit 1
