#!/bin/bash
set -e
echo "=== Docker cleanup ==="
docker container prune -f
docker image prune -f
docker builder prune --keep-storage 1GB -f
echo ""
echo "=== Disk usage after cleanup ==="
docker system df
echo "Done."
