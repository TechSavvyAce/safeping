#!/bin/bash

# =================================
# 🚀 Crypto Payment Platform Setup Script
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
        
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_success "Node.js version $NODE_VERSION is compatible"
            return 0
        else
            print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18+"
            return 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18+"
        return 1
    fi
}

# Function to check npm version
check_npm_version() {
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm version $NPM_VERSION is available"
        return 0
    else
        print_error "npm is not installed. Please install npm"
        return 1
    fi
}

# Function to create environment file
create_env_file() {
    if [ ! -f .env.local ]; then
        print_status "Creating .env.local file..."
        cp env.example .env.local
        print_success ".env.local file created"
        print_warning "Please edit .env.local with your configuration values"
    else
        print_status ".env.local file already exists"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Create data directory if it doesn't exist
    mkdir -p data
    
    # Check if database exists
    if [ ! -f data/payments.db ]; then
        print_status "Initializing database..."
        npm run db:migrate 2>/dev/null || print_warning "Database migration failed, will be created on first run"
    else
        print_success "Database already exists"
    fi
}

# Function to build the application
build_application() {
    print_status "Building application..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Application built successfully"
    else
        print_error "Failed to build application"
        exit 1
    fi
}

# Function to run health check
run_health_check() {
    print_status "Running health check..."
    
    # Start the application in background
    npm start > /dev/null 2>&1 &
    APP_PID=$!
    
    # Wait for application to start
    sleep 10
    
    # Check if application is running
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "Application is running and healthy"
        
        # Stop the application
        kill $APP_PID 2>/dev/null || true
        wait $APP_PID 2>/dev/null || true
    else
        print_error "Application health check failed"
        kill $APP_PID 2>/dev/null || true
        exit 1
    fi
}

# Function to display setup summary
display_summary() {
    echo
    echo "=========================================="
    echo "🎉 Setup Complete! 🎉"
    echo "=========================================="
    echo
    echo "Your crypto payment platform is ready!"
    echo
    echo "Next steps:"
    echo "1. Edit .env.local with your configuration"
    echo "2. Configure your blockchain networks"
    echo "3. Set up Telegram bot (optional)"
    echo "4. Configure auto-transfer settings"
    echo
    echo "Commands:"
    echo "  npm run dev          - Start development server"
    echo "  npm start            - Start production server"
    echo "  npm test             - Run tests"
    echo "  npm run db:migrate   - Run database migrations"
    echo
    echo "Access your application:"
    echo "  Frontend:     http://localhost:3000"
    echo "  Admin Panel:  http://localhost:3000/admin"
    echo "  Health Check: http://localhost:3000/api/health"
    echo
    echo "Documentation: README.md"
    echo "=========================================="
}

# Function to check system requirements
check_system_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! check_node_version; then
        exit 1
    fi
    
    # Check npm
    if ! check_npm_version; then
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    print_success "System requirements check passed"
}

# Main setup function
main() {
    echo "=========================================="
    echo "🚀 Crypto Payment Platform Setup"
    echo "=========================================="
    echo
    
    # Check system requirements
    check_system_requirements
    
    # Create environment file
    create_env_file
    
    # Install dependencies
    install_dependencies
    
    # Setup database
    setup_database
    
    # Build application
    build_application
    
    # Run health check
    run_health_check
    
    # Display summary
    display_summary
}

# Run main function
main "$@"
