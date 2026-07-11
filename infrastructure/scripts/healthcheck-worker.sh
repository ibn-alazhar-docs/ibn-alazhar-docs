#!/bin/sh
# Worker healthcheck: verifies the main Node process (PID 1) is alive
kill -0 1 2>/dev/null || exit 1
