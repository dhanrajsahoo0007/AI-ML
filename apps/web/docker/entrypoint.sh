#!/bin/sh
set -e
export MIGRATIONS_FOLDER=/opt/aiml-migrate/drizzle
export NODE_PATH=/opt/aiml-migrate/node_modules
cd /opt/aiml-migrate && node migrate.mjs
if [ "${RUN_DB_SEED:-1}" != "0" ]; then
  node seed.mjs
fi
cd /app && exec node apps/web/server.js
