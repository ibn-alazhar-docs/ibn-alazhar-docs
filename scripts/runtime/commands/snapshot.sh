#!/usr/bin/env bash

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

OUTPUT=".opencode/snapshots/session-$TIMESTAMP.md"

echo "# Runtime Session Snapshot" > $OUTPUT
echo "" >> $OUTPUT

echo "Timestamp: $TIMESTAMP" >> $OUTPUT
echo "" >> $OUTPUT

echo "## Branch" >> $OUTPUT
git branch --show-current >> $OUTPUT
echo "" >> $OUTPUT

echo "## Last Commit" >> $OUTPUT
git log --oneline -1 >> $OUTPUT
echo "" >> $OUTPUT

echo "## Git Status" >> $OUTPUT
git status --short >> $OUTPUT
echo "" >> $OUTPUT

echo "## Active Phase" >> $OUTPUT
cat .opencode/context/active-phase.md >> $OUTPUT
echo "" >> $OUTPUT

echo "## Runtime Files Count" >> $OUTPUT
find .opencode -type f | wc -l >> $OUTPUT
echo "" >> $OUTPUT

echo "Snapshot saved:"
echo "$OUTPUT"
