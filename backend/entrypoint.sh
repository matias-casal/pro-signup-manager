#!/usr/bin/env sh
set -e

python manage.py migrate --noinput

# Seed demo data unless explicitly disabled or running in a production tier.
# LOAD_DEMO_DATA supports: true/false/auto (auto seeds when not production).
seed_flag=$(printf '%s' "${LOAD_DEMO_DATA:-auto}" | tr '[:upper:]' '[:lower:]')
env_tier=$(printf '%s' "${DJANGO_ENVIRONMENT:-${ENVIRONMENT:-development}}" | tr '[:upper:]' '[:lower:]')
is_prod=false
if [ "$env_tier" = "prod" ] || [ "$env_tier" = "production" ]; then
  is_prod=true
fi

should_seed=false
if [ "$seed_flag" = "true" ] || [ "$seed_flag" = "1" ] || [ "$seed_flag" = "yes" ]; then
  should_seed=true
elif [ "$seed_flag" = "auto" ] && [ "$is_prod" = "false" ]; then
  should_seed=true
fi

if [ "$should_seed" = "true" ]; then
  if [ -n "${DEMO_CSV_PATH:-}" ]; then
    python manage.py load_demo_data --path "$DEMO_CSV_PATH"
  else
    python manage.py load_demo_data
  fi
fi

exec "$@"
