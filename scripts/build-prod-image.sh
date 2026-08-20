#!/usr/bin/env bash
#
# Build a production Superset image from this branch:
#   - lean image compiled from local source (includes AG Grid embed fix)
#   - driver layer (Postgres + Trino + common extras)
#
# Usage:
#   ./scripts/build-prod-image.sh
#   IMAGE_TAG=registry.example.com/superset:6.1.0-embed.1 ./scripts/build-prod-image.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

IMAGE_TAG="${IMAGE_TAG:-plutomen/superset:6.1.0-embed.1}"
LEAN_TAG="${IMAGE_TAG}-lean"

echo "==> Building lean image from source (AG Grid embed fix included): ${LEAN_TAG}"
docker build --target lean -t "${LEAN_TAG}" .

echo "==> Adding production drivers: ${IMAGE_TAG}"
docker build \
  -f Dockerfile.prod \
  --build-arg "BASE_IMAGE=${LEAN_TAG}" \
  -t "${IMAGE_TAG}" \
  .

echo "==> Done"
echo "    Image: ${IMAGE_TAG}"
echo "    Next:"
echo "      docker login"
echo "      docker push ${IMAGE_TAG}"
echo "      # Then deploy from Centralized Identity Provider/superset_prod"
echo "      # with SUPERSET_IMAGE=${IMAGE_TAG} in that folder's .env"
