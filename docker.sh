#!/bin/bash
# 容器内入口：node app.js server|stop …
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

export NODE_ENV=${NODE_ENV:-production}
export DISABLE_CONSOLE=${DISABLE_CONSOLE:-true}
export USE_FILE_LOG=${USE_FILE_LOG:-true}
export DEBUG=${DEBUG:-false}
export NODE_OPTIONS="${NODE_OPTIONS:---no-warnings --no-deprecation --max-old-space-size=1024}"
export REDIS_HOST=${REDIS_HOST:-127.0.0.1}
export REDIS_PORT=${REDIS_PORT:-6379}
export REDIS_DB=${REDIS_DB:-0}
export XRK_SERVER_PORT=${XRK_SERVER_PORT:-3000}

log_info "NODE_ENV=$NODE_ENV REDIS=$REDIS_HOST:$REDIS_PORT/$REDIS_DB PORT=$XRK_SERVER_PORT"

mkdir -p logs data data/server_bots data/fonts config config/default_config config/pm2 resources

if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
    log_info "Redis 可达"
  else
    log_warn "Redis 不可达 ($REDIS_HOST:$REDIS_PORT)"
  fi
fi

if [[ $# -eq 0 ]]; then
  set -- server "$XRK_SERVER_PORT"
elif [[ "$1" != "server" && "$1" != "stop" ]]; then
  set -- server "$XRK_SERVER_PORT" "$@"
fi

log_info "node app.js $*"
exec node $NODE_OPTIONS app.js "$@"
