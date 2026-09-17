#!/bin/bash
set -e

echo "=== Initializing Apache Superset for FactoryPulse ==="

# Wait for postgres
echo "Waiting for PostgreSQL warehouse to be ready..."
while ! nc -z postgres 5432; do
  sleep 2
done
echo "PostgreSQL is ready!"

# Upgrade superset metadata db
echo "Upgrading Superset metadata DB..."
superset db upgrade

# Create admin user if not existing
echo "Creating Superset admin user..."
superset fab create-admin \
    --username "${SUPERSET_ADMIN_USERNAME:-admin}" \
    --firstname "Admin" \
    --lastname "Engineer" \
    --email "${SUPERSET_ADMIN_EMAIL:-admin@factorypulse.io}" \
    --password "${SUPERSET_ADMIN_PASSWORD:-admin}" || true

# Initialize Superset roles and permissions
echo "Initializing Superset roles and permissions..."
superset init

# Run custom datasource and dashboard bootstrapping
echo "Running FactoryPulse custom dashboard and dataset registration..."
python /app/superset_init/init_superset.py || true

echo "=== FactoryPulse Superset Initialization Complete ==="
