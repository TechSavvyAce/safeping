#!/bin/bash

# =================================
# 🚀 Production Deployment Script (Node.js)
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
PORT=3000

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
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    npm ci --only=production
    
    log_success "Dependencies installed successfully"
}

# Build the application
build_app() {
    log_info "Building application..."
    
    npm run build
    
    log_success "Application built successfully"
}

# Start the application
start_app() {
    log_info "Starting application..."
    
    # Check if app is already running
    if pgrep -f "next start" > /dev/null; then
        log_warning "Application is already running, stopping it first..."
        pkill -f "next start"
        sleep 2
    fi
    
    # Start the application in background
    nohup npm start > ./logs/app.log 2>&1 &
    
    log_success "Application started successfully"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Wait for app to start
    sleep 10
    
    # Check if process is running
    if ! pgrep -f "next start" > /dev/null; then
        log_error "Application is not running"
        cat ./logs/app.log
        exit 1
    fi
    
    # Check application health
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:$PORT/api/health > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_warning "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    cat ./logs/app.log
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
    echo "📱 Application URL: http://localhost:$PORT"
    echo "🏥 Health Check: http://localhost:$PORT/api/health"
    echo "📊 API Docs: http://localhost:$PORT/api"
    echo ""
    echo "📋 Node.js Commands:"
    echo "   View logs: tail -f ./logs/app.log"
    echo "   Stop app: pkill -f 'next start'"
    echo "   Restart: $0 restart"
    echo ""
}

# Stop the application
stop_app() {
    log_info "Stopping application..."
    
    if pgrep -f "next start" > /dev/null; then
        pkill -f "next start"
        log_success "Application stopped"
    else
        log_warning "Application is not running"
    fi
}

# Restart the application
restart_app() {
    log_info "Restarting application..."
    stop_app
    sleep 2
    start_app
    health_check
    log_success "Application restarted successfully"
}

# Main deployment process
main() {
    echo "🚀 Starting deployment of $APP_NAME..."
    echo "=====================================\n"
    
    check_prerequisites
    backup_database
    install_dependencies
    build_app
    start_app
    health_check
    show_deployment_info
    
    log_success "Deployment process completed!"
}

# Create logs directory
mkdir -p ./logs

# Handle script arguments
case "${1:-deploy}" in
    "build")
        check_prerequisites
        install_dependencies
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
        tail -f ./logs/app.log
        ;;
    "stop")
        stop_app
        ;;
    "restart")
        restart_app
        ;;
    "start")
        check_prerequisites
        start_app
        health_check
        ;;
    *)
        echo "Usage: $0 {build|deploy|health|backup|logs|stop|restart|start}"
        echo ""
        echo "Commands:"
        echo "  build   - Build application only"
        echo "  deploy  - Full deployment (default)"
        echo "  health  - Run health check"
        echo "  backup  - Backup database"
        echo "  logs    - Show application logs"
        echo "  stop    - Stop application"
        echo "  restart - Restart application"
        echo "  start   - Start application only"
        exit 1
        ;;
esac
