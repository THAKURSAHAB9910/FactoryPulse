"""
Apache Superset Custom Configuration for FactoryPulse
"""

import os

# Secret Key
SECRET_KEY = os.getenv("SUPERSET_SECRET_KEY", "superset_secret_key_factorypulse_production_secure_2026")

# Enable Feature Flags
FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "ENABLE_EXPLORE_JSON_CSRF_PROTECTION": False,
}

# Superset Metadata DB
SQLALCHEMY_DATABASE_URI = os.getenv(
    "SUPERSET_DATABASE_URI",
    "postgresql://postgres:postgres@postgres:5432/factorypulse"
)

# App Title & Branding
APP_NAME = "FactoryPulse Intelligence"
APP_ICON = "/static/assets/images/superset-logo-horiz.png"

# CORS & Webserver
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ["*"]
}

# Public Role & Guest Tokens
PUBLIC_ROLE_LIKE = "Gamma"
GUEST_ROLE_NAME = "Gamma"
AUTH_ROLE_PUBLIC = "Public"

ROW_LIMIT = 50000
VIZ_ROW_LIMIT = 10000
