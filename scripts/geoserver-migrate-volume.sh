#!/bin/bash
#
# GeoServer Volume Migration Script
# Migrates GeoServer data directory from 2.18.x to 2.28.x
#
# This script:
# 1. Backs up essential data (workspaces, styles, user_projections) from the existing volume
# 2. Stops containers and removes the old volume
# 3. Starts GeoServer to create a fresh 2.28 data directory
# 4. Copies back only compatible data (NOT security!)
# 5. Fixes encrypted passwords in datastores
# 6. Restarts GeoServer
#
# Usage: ./geoserver-migrate-volume.sh [options]
#

set -e

# Configuration - modify these or pass as arguments
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-}"
VOLUME_NAME="${GEOSERVER_VOLUME:-}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yaml}"
GEOSERVER_SERVICE="${GEOSERVER_SERVICE:-geoserver}"
GEOSERVER_CONTAINER="${GEOSERVER_CONTAINER:-}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/geoserver_migration_backup}"
GEOSERVER_UID="${GEOSERVER_UID:-2000}"
GEOSERVER_GID="${GEOSERVER_GID:-2000}"

# Derive volume and container names from project name
derive_names_from_project() {
    if [ -n "$PROJECT_NAME" ]; then
        VOLUME_NAME="${VOLUME_NAME:-${PROJECT_NAME}_geodatadir}"
        GEOSERVER_CONTAINER="${GEOSERVER_CONTAINER:-${PROJECT_NAME}_geoserver}"
    fi
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Check if volume exists
check_volume() {
    if ! docker volume inspect "$VOLUME_NAME" > /dev/null 2>&1; then
        log_error "Volume '$VOLUME_NAME' not found."
        echo "Available volumes:"
        docker volume ls --format "  - {{.Name}}" | grep -i geo || echo "  No GeoServer-related volumes found"
        exit 1
    fi
    log_info "Found volume: $VOLUME_NAME"
}

# Load environment variables from .env if it exists
load_env() {
    if [ -f ".env" ]; then
        log_info "Loading environment from .env file"
        set -a
        source .env
        set +a
        
        # Update project name from .env if not already set
        PROJECT_NAME="${PROJECT_NAME:-$COMPOSE_PROJECT_NAME}"
        DB_PASSWORD="${DB_PASSWORD:-$POSTGRES_PASSWORD}"
    fi
    
    # Derive names from project
    derive_names_from_project
    
    # Final fallback defaults
    VOLUME_NAME="${VOLUME_NAME:-geodatadir}"
    GEOSERVER_CONTAINER="${GEOSERVER_CONTAINER:-geoserver}"
}

# Step 1: Backup essential directories from the volume
backup_volume() {
    log_step "Step 1: Backing up essential data from volume"
    
    mkdir -p "$BACKUP_DIR"
    
    docker run --rm \
        -v "$VOLUME_NAME":/src:ro \
        -v "$BACKUP_DIR":/backup \
        alpine sh -c "
            echo 'Backing up workspaces...'
            cp -r /src/workspaces /backup/ 2>/dev/null && echo '  ✓ workspaces' || echo '  ✗ workspaces (not found)'
            
            echo 'Backing up styles...'
            cp -r /src/styles /backup/ 2>/dev/null && echo '  ✓ styles' || echo '  ✗ styles (not found)'
            
            echo 'Backing up user_projections...'
            cp -r /src/user_projections /backup/ 2>/dev/null && echo '  ✓ user_projections' || echo '  ✗ user_projections (not found)'
            
            echo 'Backing up gwc-layers...'
            cp -r /src/gwc-layers /backup/ 2>/dev/null && echo '  ✓ gwc-layers' || echo '  ✗ gwc-layers (not found)'
            
            echo ''
            echo 'Backup contents:'
            ls -la /backup/
        "
    
    log_info "Backup saved to: $BACKUP_DIR"
}

# Step 2: Stop containers using the volume
stop_containers() {
    log_step "Step 2: Stopping containers"
    
    if [ -f "$COMPOSE_FILE" ]; then
        log_info "Stopping services via docker-compose..."
        docker-compose -f "$COMPOSE_FILE" stop "$GEOSERVER_SERVICE" 2>/dev/null || \
        docker compose -f "$COMPOSE_FILE" stop "$GEOSERVER_SERVICE" 2>/dev/null || \
        log_warn "Could not stop via compose, trying direct container stop"
    fi
    
    # Also try to stop the container directly
    docker stop "$GEOSERVER_CONTAINER" 2>/dev/null || true
    
    # Find and stop any other containers using this volume
    local containers=$(docker ps -q --filter "volume=$VOLUME_NAME" 2>/dev/null)
    if [ -n "$containers" ]; then
        log_info "Stopping other containers using the volume..."
        docker stop $containers
    fi
    
    log_info "Containers stopped"
}

# Step 3: Remove the old volume
remove_volume() {
    log_step "Step 3: Removing old volume"
    
    # Double-check no containers are using it
    local containers=$(docker ps -aq --filter "volume=$VOLUME_NAME" 2>/dev/null)
    if [ -n "$containers" ]; then
        log_warn "Removing stopped containers that reference the volume..."
        docker rm $containers 2>/dev/null || true
    fi
    
    docker volume rm "$VOLUME_NAME"
    log_info "Volume '$VOLUME_NAME' removed"
}

# Step 4: Start GeoServer to create fresh data directory
start_fresh_geoserver() {
    log_step "Step 4: Starting GeoServer to create fresh data directory"
    
    if [ -f "$COMPOSE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" up -d --build "$GEOSERVER_SERVICE" 2>/dev/null || \
        docker compose -f "$COMPOSE_FILE" up -d --build "$GEOSERVER_SERVICE"
    else
        log_error "Compose file not found: $COMPOSE_FILE"
        log_error "Please start GeoServer manually and re-run with --skip-start"
        exit 1
    fi
    
    log_info "Waiting for GeoServer to initialize (30 seconds)..."
    sleep 30
    
    # Check if it started successfully
    if docker logs "$GEOSERVER_CONTAINER" 2>&1 | grep -q "Server startup in"; then
        log_info "GeoServer started successfully"
    else
        log_warn "GeoServer may still be starting, continuing..."
    fi
}

# Step 5: Stop GeoServer and restore data
restore_data() {
    log_step "Step 5: Restoring backed up data"
    
    # Stop GeoServer first
    docker stop "$GEOSERVER_CONTAINER" 2>/dev/null || true
    sleep 2
    
    docker run --rm \
        -v "$VOLUME_NAME":/dest \
        -v "$BACKUP_DIR":/backup:ro \
        alpine sh -c "
            echo 'Restoring workspaces...'
            if [ -d /backup/workspaces ]; then
                rm -rf /dest/workspaces
                cp -r /backup/workspaces /dest/
                echo '  ✓ workspaces restored'
            fi
            
            echo 'Restoring styles...'
            if [ -d /backup/styles ]; then
                rm -rf /dest/styles
                cp -r /backup/styles /dest/
                echo '  ✓ styles restored'
            fi
            
            echo 'Restoring user_projections...'
            if [ -d /backup/user_projections ]; then
                cp -r /backup/user_projections /dest/
                echo '  ✓ user_projections restored'
            fi
            
            echo 'Restoring gwc-layers...'
            if [ -d /backup/gwc-layers ]; then
                rm -rf /dest/gwc-layers
                cp -r /backup/gwc-layers /dest/
                echo '  ✓ gwc-layers restored'
            fi
        "
    
    log_info "Data restored"
}

# Step 6: Fix encrypted passwords
fix_passwords() {
    log_step "Step 6: Fixing encrypted datastore passwords"
    
    if [ -z "$DB_PASSWORD" ]; then
        log_warn "No database password provided."
        echo -n "Enter the database password (or press Enter to skip): "
        read -r DB_PASSWORD
    fi
    
    if [ -n "$DB_PASSWORD" ]; then
        docker run --rm -v "$VOLUME_NAME":/data alpine sh -c "
            count=0
            find /data/workspaces -name 'datastore.xml' 2>/dev/null | while read f; do
                if grep -q 'crypt1:\|crypt2:' \"\$f\" 2>/dev/null; then
                    sed -i 's|<entry key=\"passwd\">crypt1:[^<]*</entry>|<entry key=\"passwd\">plain:${DB_PASSWORD}</entry>|g' \"\$f\"
                    sed -i 's|<entry key=\"passwd\">crypt2:[^<]*</entry>|<entry key=\"passwd\">plain:${DB_PASSWORD}</entry>|g' \"\$f\"
                    echo \"  ✓ Fixed password in: \$f\"
                    count=\$((count+1))
                fi
            done
            if [ \$count -eq 0 ]; then
                echo '  No encrypted passwords found'
            fi
        "
    else
        log_warn "Skipping password fix (no password provided)"
        log_warn "You may need to manually update datastore passwords in GeoServer admin"
    fi
}

# Step 7: Fix ownership
fix_ownership() {
    log_step "Step 7: Fixing file ownership"
    
    docker run --rm -v "$VOLUME_NAME":/data alpine chown -R "${GEOSERVER_UID}:${GEOSERVER_GID}" /data
    log_info "Ownership set to ${GEOSERVER_UID}:${GEOSERVER_GID}"
}

# Step 8: Disable WFS-T (Transactional WFS)
disable_wfst() {
    log_step "Step 8: Disabling WFS-T (Transactional WFS)"
    
    docker run --rm -v "$VOLUME_NAME":/data alpine sh -c "
        if [ -f /data/wfs.xml ]; then
            # Change serviceLevel from TRANSACTIONAL or COMPLETE to BASIC
            sed -i 's|<serviceLevel>TRANSACTIONAL</serviceLevel>|<serviceLevel>BASIC</serviceLevel>|g' /data/wfs.xml
            sed -i 's|<serviceLevel>COMPLETE</serviceLevel>|<serviceLevel>BASIC</serviceLevel>|g' /data/wfs.xml
            echo '  ✓ WFS-T disabled (serviceLevel set to BASIC)'
        else
            echo '  ✗ wfs.xml not found'
        fi
    "
}

# Step 9: Start all services
start_services() {
    log_step "Step 9: Starting all services"
    
    if [ -f "$COMPOSE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" up -d 2>/dev/null || \
        docker compose -f "$COMPOSE_FILE" up -d
    else
        docker start "$GEOSERVER_CONTAINER"
    fi
    
    log_info "Waiting for GeoServer to start (20 seconds)..."
    sleep 20
}

# Verify the migration
verify_migration() {
    log_step "Verification"
    
    # Check logs for successful catalog load
    local catalog_info=$(docker logs "$GEOSERVER_CONTAINER" 2>&1 | grep "Read Catalog" | tail -1)
    
    if [ -n "$catalog_info" ]; then
        log_info "Catalog loaded: $catalog_info"
    fi
    
    # Check for errors
    local errors=$(docker logs "$GEOSERVER_CONTAINER" 2>&1 | grep -i "ERROR" | tail -5)
    if [ -n "$errors" ]; then
        log_warn "Recent errors in logs:"
        echo "$errors"
    fi
    
    # Check if GeoServer is responding
    sleep 5
    if docker logs "$GEOSERVER_CONTAINER" 2>&1 | grep -q "Server startup in"; then
        log_info "GeoServer is running"
    else
        log_warn "Could not confirm GeoServer startup"
    fi
}

# Cleanup backup
cleanup() {
    if [ -d "$BACKUP_DIR" ]; then
        echo -n "Remove backup directory $BACKUP_DIR? [y/N] "
        read -r confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            rm -rf "$BACKUP_DIR"
            log_info "Backup removed"
        else
            log_info "Backup preserved at: $BACKUP_DIR"
        fi
    fi
}

# Show help
show_help() {
    echo "GeoServer Volume Migration Script"
    echo ""
    echo "Migrates GeoServer data directory from 2.18.x to 2.28.x"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --project NAME        Project name (derives volume and container names)"
    echo "                        Volume: NAME_geodatadir, Container: NAME_geoserver"
    echo "  --volume NAME         GeoServer data volume name (overrides --project)"
    echo "  --compose-file FILE   Docker compose file (default: docker-compose.yaml)"
    echo "  --service NAME        GeoServer service name in compose (default: geoserver)"
    echo "  --container NAME      GeoServer container name (overrides --project)"
    echo "  --db-password PASS    Database password for datastore fix"
    echo "  --backup-dir DIR      Backup directory (default: /tmp/geoserver_migration_backup)"
    echo "  --uid UID             GeoServer user ID (default: 2000)"
    echo "  --gid GID             GeoServer group ID (default: 2000)"
    echo "  --no-cleanup          Don't ask to remove backup after migration"
    echo "  --help                Show this help message"
    echo ""
    echo "Environment variables (can also use .env file):"
    echo "  COMPOSE_PROJECT_NAME  Project name (alternative to --project)"
    echo "  POSTGRES_PASSWORD     Alternative to --db-password"
    echo ""
    echo "Examples:"
    echo "  $0 --project hidrovia --db-password mypassword"
    echo "  $0 --project myapp --compose-file docker-compose.prod.yaml"
    echo ""
}

# Main execution
main() {
    local no_cleanup=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --project)
                PROJECT_NAME="$2"
                shift 2
                ;;
            --volume)
                VOLUME_NAME="$2"
                shift 2
                ;;
            --compose-file)
                COMPOSE_FILE="$2"
                shift 2
                ;;
            --service)
                GEOSERVER_SERVICE="$2"
                shift 2
                ;;
            --container)
                GEOSERVER_CONTAINER="$2"
                shift 2
                ;;
            --db-password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --backup-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --uid)
                GEOSERVER_UID="$2"
                shift 2
                ;;
            --gid)
                GEOSERVER_GID="$2"
                shift 2
                ;;
            --no-cleanup)
                no_cleanup=true
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
    
    echo "=========================================="
    echo "  GeoServer Volume Migration Script"
    echo "  2.18.x -> 2.28.x"
    echo "=========================================="
    echo ""
    
    load_env
    
    # Derive names again after parsing args (in case --project was passed)
    derive_names_from_project
    
    log_info "Configuration:"
    echo "  Project:     ${PROJECT_NAME:-<not set>}"
    echo "  Volume:      $VOLUME_NAME"
    echo "  Compose:     $COMPOSE_FILE"
    echo "  Service:     $GEOSERVER_SERVICE"
    echo "  Container:   $GEOSERVER_CONTAINER"
    echo "  Backup dir:  $BACKUP_DIR"
    echo "  UID:GID:     ${GEOSERVER_UID}:${GEOSERVER_GID}"
    echo ""
    
    log_warn "This script will:"
    echo "  1. Backup workspaces, styles, and projections from the volume"
    echo "  2. REMOVE the existing volume (all data except backup will be lost!)"
    echo "  3. Create a fresh GeoServer 2.28 data directory"
    echo "  4. Restore your workspaces, styles, and projections"
    echo "  5. Fix encrypted passwords in datastores"
    echo "  6. Disable WFS-T (Transactional WFS)"
    echo ""
    
    echo -n "Proceed with migration? [y/N] "
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Aborted."
        exit 0
    fi
    echo ""
    
    check_docker
    check_volume
    
    backup_volume
    stop_containers
    remove_volume
    start_fresh_geoserver
    restore_data
    fix_passwords
    fix_ownership
    disable_wfst
    start_services
    verify_migration
    
    echo ""
    log_info "=========================================="
    log_info "  Migration complete!"
    log_info "=========================================="
    echo ""
    log_info "Please verify:"
    echo "  1. Access GeoServer web interface"
    echo "  2. Check that all layers are visible and working"
    echo "  3. Verify datastore connections"
    echo ""
    
    if [ "$no_cleanup" = false ]; then
        cleanup
    fi
}

main "$@"
