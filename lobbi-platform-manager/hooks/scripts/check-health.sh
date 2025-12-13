#!/bin/bash
# Service health check hook for lobbi-platform-manager
# Validates services are running after deployment changes

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables if .env.example exists
if [ -f "hooks/.env.example" ]; then
    source hooks/.env.example
fi

# Default service endpoints (can be overridden by environment variables)
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:3000}"
MEMBERSHIP_URL="${MEMBERSHIP_URL:-http://localhost:3001}"
PAYMENT_URL="${PAYMENT_URL:-http://localhost:3002}"
WEB_URL="${WEB_URL:-http://localhost:3003}"
MONGODB_HOST="${MONGODB_HOST:-localhost:27017}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost:5432}"
REDIS_HOST="${REDIS_HOST:-localhost:6379}"

# Health check timeout (seconds)
TIMEOUT="${HEALTH_CHECK_TIMEOUT:-5}"

# Get the file that was changed
FILE_PATH="${1:-}"

echo -e "${GREEN}[HEALTH CHECK]${NC} Starting service health validation..."

if [ -n "$FILE_PATH" ]; then
    echo -e "${BLUE}[INFO]${NC} Changed file: $FILE_PATH"
fi

# Function to check HTTP endpoint
check_http_endpoint() {
    local name=$1
    local url=$2
    local endpoint=${3:-/health}

    echo -e "${BLUE}[INFO]${NC} Checking $name at $url$endpoint"

    if curl -sf --max-time $TIMEOUT "$url$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC} $name is healthy"
        return 0
    else
        echo -e "${YELLOW}[WARNING]${NC} $name is not responding at $url$endpoint"
        return 1
    fi
}

# Function to check TCP port
check_tcp_port() {
    local name=$1
    local host=$2
    local port=$3

    echo -e "${BLUE}[INFO]${NC} Checking $name at $host:$port"

    if timeout $TIMEOUT bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
        echo -e "${GREEN}[OK]${NC} $name is accepting connections"
        return 0
    else
        echo -e "${YELLOW}[WARNING]${NC} $name is not accepting connections at $host:$port"
        return 1
    fi
}

# Track health status
UNHEALTHY_SERVICES=0

# Check if docker-compose was modified
if [[ "$FILE_PATH" =~ docker-compose ]]; then
    echo -e "${YELLOW}[INFO]${NC} Docker Compose configuration was modified"
    echo -e "${BLUE}[INFO]${NC} Checking if services are running via Docker..."

    # Check if docker-compose is available
    if command -v docker-compose &> /dev/null; then
        RUNNING_SERVICES=$(docker-compose ps --services --filter "status=running" 2>/dev/null || echo "")

        if [ -n "$RUNNING_SERVICES" ]; then
            echo -e "${GREEN}[INFO]${NC} Running services via docker-compose:"
            echo "$RUNNING_SERVICES" | while read service; do
                echo -e "  ${GREEN}✓${NC} $service"
            done
        else
            echo -e "${YELLOW}[WARNING]${NC} No services are currently running via docker-compose"
        fi
    fi
fi

# Check Keycloak
if [[ "$FILE_PATH" =~ (keycloak|docker-compose|Dockerfile) ]]; then
    check_http_endpoint "Keycloak" "$KEYCLOAK_URL" "/health/ready" || ((UNHEALTHY_SERVICES++))
fi

# Check API Gateway
if [[ "$FILE_PATH" =~ (api-gateway|docker-compose|package\.json) ]] || [[ -z "$FILE_PATH" ]]; then
    check_http_endpoint "API Gateway" "$API_GATEWAY_URL" "/health" || ((UNHEALTHY_SERVICES++))
fi

# Check Membership Service
if [[ "$FILE_PATH" =~ (membership|docker-compose|package\.json) ]] || [[ -z "$FILE_PATH" ]]; then
    check_http_endpoint "Membership Service" "$MEMBERSHIP_URL" "/health" || ((UNHEALTHY_SERVICES++))
fi

# Check Payment Service
if [[ "$FILE_PATH" =~ (payment|docker-compose|package\.json) ]] || [[ -z "$FILE_PATH" ]]; then
    check_http_endpoint "Payment Service" "$PAYMENT_URL" "/health" || ((UNHEALTHY_SERVICES++))
fi

# Check Web Service
if [[ "$FILE_PATH" =~ (web|docker-compose|package\.json) ]] || [[ -z "$FILE_PATH" ]]; then
    check_http_endpoint "Web Service" "$WEB_URL" || ((UNHEALTHY_SERVICES++))
fi

# Check MongoDB
if [[ "$FILE_PATH" =~ (mongo|docker-compose) ]] || [[ -z "$FILE_PATH" ]]; then
    IFS=':' read -r MONGO_HOST MONGO_PORT <<< "$MONGODB_HOST"
    check_tcp_port "MongoDB" "${MONGO_HOST}" "${MONGO_PORT}" || ((UNHEALTHY_SERVICES++))
fi

# Check PostgreSQL
if [[ "$FILE_PATH" =~ (postgres|docker-compose) ]] || [[ -z "$FILE_PATH" ]]; then
    IFS=':' read -r PG_HOST PG_PORT <<< "$POSTGRES_HOST"
    check_tcp_port "PostgreSQL" "${PG_HOST}" "${PG_PORT}" || ((UNHEALTHY_SERVICES++))
fi

# Check Redis
if [[ "$FILE_PATH" =~ (redis|docker-compose) ]] || [[ -z "$FILE_PATH" ]]; then
    IFS=':' read -r REDIS_HOST_ONLY REDIS_PORT <<< "$REDIS_HOST"
    check_tcp_port "Redis" "${REDIS_HOST_ONLY}" "${REDIS_PORT}" || ((UNHEALTHY_SERVICES++))
fi

# Final verdict
echo ""
if [ $UNHEALTHY_SERVICES -eq 0 ]; then
    echo -e "${GREEN}[PASSED]${NC} All checked services are healthy"
    exit 0
else
    echo -e "${YELLOW}[WARNING]${NC} $UNHEALTHY_SERVICES service(s) are not responding"
    echo -e "${YELLOW}[INFO]${NC} This is a warning only. Deploy changes might need services to restart."
    echo -e "${BLUE}[TIP]${NC} Run 'docker-compose up -d' to start services or '/lobbi:health' to check status"
    exit 0  # Don't fail the hook, just warn
fi
