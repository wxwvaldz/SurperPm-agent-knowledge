#!/bin/bash
# get-goal-diff.sh
# Gets git diff between goal start commit and HEAD
# Usage: ./get-goal-diff.sh [output-file]

set -e

OUTPUT_FILE="${1:-/tmp/goal-diff.txt}"
START_COMMIT_FILE="/tmp/goal-start-commit.txt"

echo "🔍 Getting git diff for this goal..."

# Check if start commit file exists
if [ ! -f "$START_COMMIT_FILE" ]; then
    echo "⚠️ Warning: Start commit not recorded"
    echo "File not found: $START_COMMIT_FILE"
    echo ""
    echo "Using fallback: git diff HEAD~1 HEAD (may be incomplete)"
    echo ""
    
    # Fallback to HEAD~1
    git diff HEAD~1 HEAD > "$OUTPUT_FILE"
    
    echo "✅ Diff saved to: $OUTPUT_FILE"
    echo "⚠️ Note: This may be incomplete if multiple commits were made"
    exit 0
fi

# Read start commit
START_COMMIT=$(cat "$START_COMMIT_FILE")
echo "Start commit: $START_COMMIT"

# Get diff between goal start and now
git diff "$START_COMMIT" HEAD > "$OUTPUT_FILE"

# Check if diff is empty
if [ ! -s "$OUTPUT_FILE" ]; then
    echo "⚠️ Warning: Diff is empty (no changes detected)"
    echo "This might mean:"
    echo "  - No files were modified during this goal"
    echo "  - Start commit is the same as HEAD"
else
    LINES=$(wc -l < "$OUTPUT_FILE")
    echo "✅ Diff saved to: $OUTPUT_FILE ($LINES lines)"
fi

echo ""
echo "Usage in auto-distill:"
echo "  cat $OUTPUT_FILE | head -50  # Preview first 50 lines"
