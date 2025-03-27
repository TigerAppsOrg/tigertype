#!/bin/bash

# TigerType Test Runner
# This script runs tests for TigerType codebase

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default choice
DEFAULT_CHOICE=2

# Show header
echo -e "${YELLOW}${BOLD}TigerType Test Runner${NC}"
echo -e "${CYAN}=============================${NC}"
echo ""

# Function to run tests with nice output
run_tests() {
  TEST_TYPE=$1
  COMMAND=$2

  echo -e "${YELLOW}Running $TEST_TYPE Tests...${NC}"
  echo -e "${CYAN}Command: $COMMAND${NC}"
  echo -e "${CYAN}------------------------------${NC}"
  
  # Run the test command
  eval $COMMAND
  
  # Check exit status
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $TEST_TYPE Tests Passed${NC}"
  else
    echo -e "${RED}✗ $TEST_TYPE Tests Failed${NC}"
  fi
  echo ""
}

# Ask what tests to run
echo -e "${BOLD}What tests would you like to run?${NC}"
echo "1. All Tests (Server + Client) - Standard Output"
echo -e "${YELLOW}2. All Tests (Server + Client) - With Progress Bar${NC} [Default]"
echo "3. Server Tests Only"
echo "4. Client Tests Only"
echo "5. Client Tests with Progress Bar"
echo "6. Exit"
read -p "Enter your choice (1-6) or press Enter for default: " choice

# Use default if empty
if [ -z "$choice" ]; then
  choice=$DEFAULT_CHOICE
  echo "Using default choice: $DEFAULT_CHOICE"
fi

case $choice in
  1)
    run_tests "All" "npm run test:all"
    ;;
  2)
    run_tests "All (Pretty)" "npm run test:all:pretty"
    ;;
  3)
    run_tests "Server" "npm run test:server"
    ;;
  4)
    run_tests "Client" "npm run test:client"
    ;;
  5)
    run_tests "Client (Pretty)" "npm run test:client:progress"
    ;;
  6)
    echo "Exiting..."
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid choice. Exiting...${NC}"
    exit 1
    ;;
esac

# Final message
echo -e "${YELLOW}Test Run Complete${NC}"
echo "See above for test results and any failures."
echo "Fix any failing tests before merging your changes."
echo "" 