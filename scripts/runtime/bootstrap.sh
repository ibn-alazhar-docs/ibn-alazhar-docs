#!/usr/bin/env bash

clear

echo "====================================="
echo " Ibn Al-Azhar Docs — OpenCode Runtime"
echo "====================================="

echo ""
echo "Loading runtime..."

echo ""
cat .opencode/BOOT_SEQUENCE.md

echo ""
echo "Loading active phase..."
cat .opencode/context/active-phase.md

echo ""
echo "Loading source of truth..."
cat governance/SOURCE_OF_TRUTH.md

echo ""
echo "Runtime ready."
