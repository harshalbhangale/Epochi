#!/bin/bash

# ===========================================
# EPOCHI DEPLOYMENT SCRIPT
# ===========================================

set -e

echo "🚀 Starting Epochi Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check for environment files
if [ ! -f "./backend/.env" ] && [ ! -f "./backend/.env.production" ]; then
    echo -e "${YELLOW}⚠️  No backend .env file found. Creating from .env.example...${NC}"
    if [ -f "./backend/.env.example" ]; then
        cp ./backend/.env.example ./backend/.env
        echo -e "${YELLOW}📝 Please edit backend/.env with your configuration before continuing.${NC}"
        exit 1
    else
        echo -e "${RED}❌ No .env.example found. Please create backend/.env manually.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Environment files found${NC}"

# Build and start containers
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting containers..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check health
echo "🏥 Checking service health..."

BACKEND_HEALTH=$(curl -s http://localhost:3001/health | grep -o '"status":"healthy"' || echo "")
if [ -n "$BACKEND_HEALTH" ]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    docker-compose logs backend
fi

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be starting (HTTP $FRONTEND_STATUS)${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Epochi Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend:  http://localhost:3001"
echo "📍 Health:   http://localhost:3001/health"
echo ""
echo "📋 Useful commands:"
echo "   docker-compose logs -f    # View logs"
echo "   docker-compose down       # Stop services"
echo "   docker-compose restart    # Restart services"
echo ""

