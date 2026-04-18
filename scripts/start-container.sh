#!/bin/sh

set -eu

redis-server --save "" --appendonly no --protected-mode no --bind 0.0.0.0 &
redis_pid=$!

cleanup() {
  kill "$redis_pid" 2>/dev/null || true
  wait "$redis_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

until redis-cli -h 127.0.0.1 ping >/dev/null 2>&1; do
  sleep 1
done

node .output/server/index.mjs &
app_pid=$!

wait "$app_pid"
app_status=$?

cleanup

exit "$app_status"