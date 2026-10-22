#!/bin/bash
#
# Reset a service's node_modules volume
#
# docker-compose.dev.yaml bind-mounts a service's source directory over /app
# (for live-reload) while keeping /app/node_modules as a separate, persistent
# anonymous volume (so installed packages survive plain restarts). That volume
# is only ever populated from the image ONCE, when first created - rebuilding
# the image afterward (e.g. after changing package.json) has NO effect on what
# is actually mounted at that path until the volume itself is cleared. This
# script finds that volume, removes it, and rebuilds the service so Docker
# repopulates it fresh from the current image.
#
# Usage: ./scripts/reset-node-modules.sh --service api [options]
#

set -e

SERVICE=""
MOUNT_PATH="/app/node_modules"
COMPOSE_FILE="docker-compose.dev.yaml"
ASSUME_YES=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${BLUE}==== $1 ====${NC}"; }

show_help() {
    echo "Reset a service's node_modules volume"
    echo ""
    echo "Usage: $0 --service NAME [options]"
    echo ""
    echo "Options:"
    echo "  --service NAME        Compose service to reset (required, e.g. api, client)"
    echo "  --mount PATH           Mount path backed by the stale volume (default: /app/node_modules)"
    echo "  --compose-file FILE    Compose file to use (default: docker-compose.dev.yaml)"
    echo "  --yes                  Skip the confirmation prompt"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --service api"
    echo "  $0 --service client --compose-file docker-compose.dev.yaml"
    echo ""
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --mount)
            MOUNT_PATH="$2"
            shift 2
            ;;
        --compose-file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --yes)
            ASSUME_YES=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

if [ -z "$SERVICE" ]; then
    log_error "Missing required --service NAME"
    echo "Use --help for usage information"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

log_step "Locating $SERVICE's volume at $MOUNT_PATH"

CONTAINER_ID=$(docker compose -f "$COMPOSE_FILE" ps -q "$SERVICE" 2>/dev/null)

if [ -z "$CONTAINER_ID" ]; then
    log_error "No running container found for service '$SERVICE' (compose file: $COMPOSE_FILE)."
    log_error "Start it at least once first, e.g.: docker compose -f $COMPOSE_FILE up -d $SERVICE"
    exit 1
fi

VOLUME_ID=$(docker inspect "$CONTAINER_ID" --format \
    "{{range .Mounts}}{{if eq .Destination \"$MOUNT_PATH\"}}{{.Name}}{{end}}{{end}}")

if [ -z "$VOLUME_ID" ]; then
    log_error "Could not find a volume mounted at $MOUNT_PATH for service '$SERVICE'."
    log_error "Check the mount path, or list volumes manually with: docker volume ls"
    exit 1
fi

log_info "Found volume: $VOLUME_ID"

if [ "$ASSUME_YES" = false ]; then
    log_warn "This will remove that volume (its current contents, not your source code) and rebuild '$SERVICE'."
    echo -n "Proceed? [y/N] "
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Aborted."
        exit 0
    fi
fi

log_step "Removing $SERVICE container and its stale volume"
docker compose -f "$COMPOSE_FILE" rm -f -s "$SERVICE"
docker volume rm "$VOLUME_ID"

log_step "Rebuilding and starting $SERVICE"
docker compose -f "$COMPOSE_FILE" up -d --build --force-recreate "$SERVICE"

log_info "Done. $MOUNT_PATH for '$SERVICE' has been repopulated from the current image."
