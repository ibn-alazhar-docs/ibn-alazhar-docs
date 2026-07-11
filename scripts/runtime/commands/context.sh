#!/usr/bin/env bash

clear

echo "=================="
echo " Runtime Context"
echo "=================="

echo ""
echo "[Phase]"
cat .opencode/context/active-phase.md

echo ""
echo "[Source Of Truth]"
cat governance/SOURCE_OF_TRUTH.md

echo ""
echo "[Runtime Authority]"
cat .opencode/context/runtime-source-of-truth.md

echo ""
echo "[Specs]"
find specs -maxdepth 1 -type d

echo ""
echo "Context loaded."
