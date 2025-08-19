#!/bin/bash

# =================================
# 🚀 Production Deployment Script
# =================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="crypto-payment-platform"
DOCKER_IMAGE="$APP_NAME:latest"
CONTAINER_NAME="$APP_NAME-app"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build the application
build_app() {
    log_info "Building application..."
    
    # Build Docker image
    docker build -t $DOCKER_IMAGE .
    
    log_success "Application built successfully"
}

# Deploy the application
deploy_app() {
    log_info "Deploying application..."
    
    # Stop existing containers
    if docker ps -q --filter "name=$CONTAINER_NAME" | grep -q .; then
        log_warning "Stopping existing container..."
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
    fi
    
    # Start new containers
    docker-compose up -d
    
    log_success "Application deployed successfully"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Wait for app to start
    sleep 10
    
    # Check if container is running
    if ! docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" | grep -q $CONTAINER_NAME; then
        log_error "Container is not running"
        docker logs $CONTAINER_NAME
        exit 1
    fi
    
    # Check application health
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_warning "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    docker logs $CONTAINER_NAME
    exit 1
}

# Backup database
backup_database() {
    log_info "Creating database backup..."
    
    local backup_dir="./backups"
    local backup_file="$backup_dir/payments_$(date +%Y%m%d_%H%M%S).db"
    
    mkdir -p $backup_dir
    
    if [ -f "./data/payments.db" ]; then
        cp "./data/payments.db" "$backup_file"
        log_success "Database backup created: $backup_file"
    else
        log_warning "No existing database found to backup"
    fi
}

# Show deployment info
show_deployment_info() {
    log_success "Deployment completed successfully!"
    echo ""
    echo "📱 Application URL: http://localhost:3000"
    echo "🏥 Health Check: http://localhost:3000/api/health"
    echo "📊 API Docs: http://localhost:3000/api"
    echo ""
    echo "🐳 Docker Commands:"
    echo "   View logs: docker logs $CONTAINER_NAME"
    echo "   Stop app: docker-compose down"
    echo "   Restart: docker-compose restart"
    echo ""
}

# Main deployment process
main() {
    echo "🚀 Starting deployment of $APP_NAME..."
    echo "=====================================\n"
    
    check_prerequisites
    backup_database
    build_app
    deploy_app
    health_check
    show_deployment_info
    
    log_success "Deployment process completed!"
}

# Handle script arguments
case "${1:-deploy}" in
    "build")
        check_prerequisites
        build_app
        ;;
    "deploy")
        main
        ;;
    "health")
        health_check
        ;;
    "backup")
        backup_database
        ;;
    "logs")
        docker logs -f $CONTAINER_NAME
        ;;
    "stop")
        docker-compose down
        log_success "Application stopped"
        ;;
    *)
        echo "Usage: $0 {build|deploy|health|backup|logs|stop}"
        echo ""
        echo "Commands:"
        echo "  build   - Build Docker image only"
        echo "  deploy  - Full deployment (default)"
        echo "  health  - Run health check"
        echo "  backup  - Backup database"
        echo "  logs    - Show application logs"
        echo "  stop    - Stop application"
        exit 1
        ;;
esac
