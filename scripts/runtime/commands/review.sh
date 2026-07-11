#!/usr/bin/env bash

clear

echo "=================="
echo " Runtime Review"
echo "=================="

echo ""
echo "[Governance]"
find governance -type f | wc -l

echo ""
echo "[Specs]"
find specs -maxdepth 2 -type f | wc -l

echo ""
echo "[Runtime]"
find .opencode -type f | wc -l

echo ""
echo "[Docker]"
find docker -type f | wc -l

echo ""
echo "[Scripts]"
find scripts -type f | wc -l

echo ""
echo "Review complete."
