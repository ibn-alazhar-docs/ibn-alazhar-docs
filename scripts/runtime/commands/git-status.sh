#!/usr/bin/env bash

clear

echo "=================="
echo " Git Runtime Status"
echo "=================="

echo ""
git status --short

echo ""
echo "[Current Branch]"
git branch --show-current

echo ""
echo "[Last Commit]"
git log --oneline -1
