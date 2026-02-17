#!/bin/bash
# Start ESPN Importer Service

cd "$(dirname "$0")"

echo "Starting ESPN Importer Service on port 8001..."
python3 main.py
