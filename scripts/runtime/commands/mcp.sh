#!/usr/bin/env bash

clear

echo "=================="
echo " MCP Runtime"
echo "=================="

echo ""
cat .opencode/mcp/mcp-registry.json

echo ""
echo "[Available MCP Files]"
find .opencode/mcp -type f

echo ""
echo "MCP runtime loaded."
