FROM --platform=linux/amd64 apache/superset:3.1.0

USER root

# Install PostgreSQL driver & netcat for wait script
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*
RUN pip install psycopg2-binary

# Copy configuration and init scripts
COPY superset_config.py /app/pythonpath/superset_config.py
COPY init_superset.py /app/superset_init/init_superset.py
COPY init_superset.sh /app/superset_init/init_superset.sh

RUN chmod +x /app/superset_init/init_superset.sh

USER superset

ENV SUPERSET_CONFIG_PATH=/app/pythonpath/superset_config.py

EXPOSE 8088
