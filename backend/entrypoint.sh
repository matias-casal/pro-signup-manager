#!/usr/bin/env sh
set -e

python manage.py migrate --noinput

should_seed=$(printf '%s' "${LOAD_DEMO_DATA:-true}" | tr '[:upper:]' '[:lower:]')
if [ "$should_seed" = "true" ] || [ "$should_seed" = "1" ] || [ "$should_seed" = "yes" ]; then
  if [ -n "${DEMO_CSV_PATH:-}" ]; then
    python manage.py load_demo_data --path "$DEMO_CSV_PATH"
  else
    python manage.py load_demo_data
  fi
fi

exec "$@"
