#!/bin/bash

echo "========================================"
echo "   Dungeon Desktop - Build Script"
echo "========================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm is not installed${NC}"
    exit 1
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}ERROR: Rust is not installed${NC}"
    echo "Please install Rust from https://rustup.rs/"
    exit 1
fi

echo "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to install dependencies${NC}"
        exit 1
    fi
fi

echo
echo "Starting clean build..."
echo

# Clean previous builds
echo -e "${YELLOW}[1/4] Cleaning previous builds...${NC}"
npm run clean
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}WARNING: Clean failed, continuing...${NC}"
fi

# Run linting
echo -e "${YELLOW}[2/4] Running code checks...${NC}"
npm run lint
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}WARNING: Linting issues found, continuing with build...${NC}"
fi

# Build frontend
echo -e "${YELLOW}[3/4] Building frontend...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Frontend build failed${NC}"
    exit 1
fi

# Build Tauri app
echo -e "${YELLOW}[4/4] Building desktop application...${NC}"
npm run tauri:build
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Desktop application build failed${NC}"
    exit 1
fi

echo
echo -e "${GREEN}========================================"
echo "   BUILD COMPLETED SUCCESSFULLY!"
echo "========================================${NC}"
echo
echo "Your application has been built and can be found in:"

# Determine the platform and show appropriate paths
case "$(uname -s)" in
    Darwin*)    echo "  - macOS: src-tauri/target/release/bundle/macos/";;
    Linux*)     echo "  - Linux: src-tauri/target/release/bundle/";;
    CYGWIN*|MINGW32*|MSYS*|MINGW*) echo "  - Windows: src-tauri/target/release/bundle/msi/";;
    *)          echo "  - Binary: src-tauri/target/release/";;
esac

echo "  - Executable: src-tauri/target/release/dndmapper"
echo

# Open build directory on macOS/Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening build directory..."
    open "src-tauri/target/release/bundle"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v xdg-open &> /dev/null; then
        echo "Opening build directory..."
        xdg-open "src-tauri/target/release/bundle" 2>/dev/null || echo "Build complete! Check src-tauri/target/release/bundle"
    fi
fi
