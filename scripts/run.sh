#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=8080
URL="http://localhost:${PORT}/web/index.html"

echo "Starting TraderBot server..."
echo "  Root: $ROOT"
echo "  URL:  $URL"

# Kill any existing server on the same port
lsof -ti tcp:${PORT} | xargs kill -9 2>/dev/null || true

# Start Python HTTP server in the background
python3 -m http.server ${PORT} --directory "$ROOT" &
SERVER_PID=$!

echo "  PID:  $SERVER_PID"
sleep 1

if command -v open &>/dev/null; then
  open "$URL"
elif command -v xdg-open &>/dev/null; then
  xdg-open "$URL"
fi

echo ""
echo "Press Ctrl+C to stop the server."
trap "kill $SERVER_PID 2>/dev/null; echo 'Server stopped.'" INT TERM
wait $SERVER_PID
