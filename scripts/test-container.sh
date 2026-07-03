#!/usr/bin/env bash
# Ajaa vitest-testit eristetyssä kontissa CPU- ja muistirajattuna, jottei
# testiajo saturoi hostin ytimiä (useampi rinnakkainen Claude-sessio + testiajo
# kaatoi koneen suorituskyvyn ilman rajoja).
#
# Runtime: docker (oletus) tai Apple container. Pakota: CONTAINER_RUNTIME=container
# Säädöt: TEST_CPUS (oletus 4), TEST_MEMORY (oletus 4g)
# Käyttö: scripts/test-container.sh [vitest-suodatin...]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE=poker-test
# Volume per checkout/worktree, jotta rinnakkaiset ajot eivät kilpaile samasta node_modulesista
VOLUME="poker-test-modules-$(basename "$ROOT")"
CPUS="${TEST_CPUS:-4}"
MEMORY="${TEST_MEMORY:-4g}"

if [ -n "${CONTAINER_RUNTIME:-}" ]; then
  RT="$CONTAINER_RUNTIME"
elif docker info >/dev/null 2>&1; then
  RT=docker
elif container system status >/dev/null 2>&1; then
  RT=container
else
  echo "Ei käynnissä olevaa container-runtimea. Käynnistä Docker Desktop tai 'container system start'." >&2
  exit 1
fi

# Dockerin VM:llä voi olla vähemmän ytimiä kuin hostilla — katkaise raja siihen
if [ "$RT" = docker ]; then
  AVAIL="$(docker info --format '{{.NCPU}}')"
  [ "$CPUS" -gt "$AVAIL" ] && CPUS="$AVAIL"
fi

$RT image inspect "$IMAGE" >/dev/null 2>&1 || $RT build -t "$IMAGE" -f "$ROOT/docker/test.Dockerfile" "$ROOT/docker"
$RT volume create "$VOLUME" >/dev/null 2>&1 || true

# TURVA: vain repo + nimetty volume mountataan. Ei host-system-mountteja,
# ei --privileged, ei docker-socketia.
exec $RT run --rm --cpus "$CPUS" --memory "$MEMORY" \
  --volume "$ROOT:/app" --volume "$VOLUME:/app/node_modules" \
  "$IMAGE" \
  sh -c "bun install --frozen-lockfile && bun run build:shared && bun run test --run --maxWorkers=$CPUS $*"
