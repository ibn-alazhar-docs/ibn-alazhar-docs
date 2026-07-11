#!/usr/bin/env bash

clear

echo "=================="
echo " Runtime Health"
echo "=================="

echo ""
echo "[Runtime Size]"
du -sh .opencode

echo ""
echo "[Runtime Files]"
find .opencode -type f | wc -l

echo ""
echo "[Specs]"
find specs -maxdepth 1 -type d | wc -l

echo ""
echo "[Governance]"
find governance -type f | wc -l

echo ""
echo "[Docker]"
tree docker -L 2

echo ""
echo "Health check complete."
