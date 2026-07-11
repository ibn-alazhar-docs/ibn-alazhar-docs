#!/usr/bin/env bash

clear

echo "=================================="
echo " Ibn Runtime Omnistatus"
echo "=================================="

echo ""
echo "[Branch]"
git branch --show-current

echo ""
echo "[Last Commit]"
git log --oneline -1

echo ""
echo "[Git Status]"
git status --short

echo ""
echo "[Active Phase]"
cat .opencode/context/active-phase.md

echo ""
echo "[Specs]"
find specs -maxdepth 1 -type d

echo ""
echo "[Governance]"
find governance -type f

echo ""
echo "[Runtime Size]"
du -sh .opencode

echo ""
echo "[Runtime Files]"
find .opencode -type f | wc -l

echo ""
echo "[Docker]"
find docker -type f

echo ""
echo "[MCP]"
find .opencode/mcp -type f

echo ""
echo "Runtime status complete."
