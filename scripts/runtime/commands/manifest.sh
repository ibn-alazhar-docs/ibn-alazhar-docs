#!/usr/bin/env bash

clear

OUTPUT=".opencode/runtime-manifest.md"

echo "# Runtime Manifest" > $OUTPUT
echo "" >> $OUTPUT

echo "Generated: $(date)" >> $OUTPUT
echo "" >> $OUTPUT

echo "## Current Branch" >> $OUTPUT
git branch --show-current >> $OUTPUT
echo "" >> $OUTPUT

echo "## Active Phase" >> $OUTPUT
cat .opencode/context/active-phase.md >> $OUTPUT
echo "" >> $OUTPUT

echo "## Governance Files" >> $OUTPUT
find governance -type f >> $OUTPUT
echo "" >> $OUTPUT

echo "## Specs" >> $OUTPUT
find specs -maxdepth 2 -type f >> $OUTPUT
echo "" >> $OUTPUT

echo "## Runtime Files" >> $OUTPUT
find .opencode -maxdepth 2 -type f >> $OUTPUT
echo "" >> $OUTPUT

echo "Manifest generated:"
echo "$OUTPUT"
