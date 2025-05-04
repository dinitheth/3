#!/bin/bash
# Build and deploy MicroMatch contract
cd smart-contract
linera project build
linera project publish --json > ../app_id.json
linera project deploy --json > ../service_id.json
echo "App and service IDs saved."