#!/bin/bash
# check-index-consistency.sh
# Validates INDEX.md files against actual files in directory
# Usage: ./check-index-consistency.sh <directory>

set -e

DIRECTORY="$1"
INDEX_FILE="$DIRECTORY/INDEX.md"

if [ ! -f "$INDEX_FILE" ]; then
    echo "⚠️ No INDEX.md found in $DIRECTORY"
    exit 0
fi

echo "📋 Checking INDEX.md consistency in: $DIRECTORY"
echo ""

# Extract file references from INDEX.md
REFERENCED_FILES=$(grep -oE '\[.*\]\(.*\)' "$INDEX_FILE" | grep -oE '\(.*\)' | tr -d '()' || true)

# Check for orphan references (file referenced but doesn't exist)
ORPHAN_COUNT=0
echo "🔍 Checking for orphan references..."
for file_ref in $REFERENCED_FILES; do
    # Skip if it's a relative path starting with ./
    if [[ "$file_ref" == ./* ]]; then
        actual_path="$DIRECTORY/$file_ref"
    else
        actual_path="$file_ref"
    fi
    
    if [ ! -f "$actual_path" ]; then
        echo "  ⚠️ Orphan reference: $file_ref"
        ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
    fi
done

if [ $ORPHAN_COUNT -eq 0 ]; then
    echo "  ✅ No orphan references found"
fi

echo ""

# Check for unindexed files (file exists but not in INDEX.md)
UNINDEXED_COUNT=0
echo "🔍 Checking for unindexed files..."
find "$DIRECTORY" -name "*.md" ! -name "INDEX.md" -type f | while read actual_file; do
    rel_path="${actual_file#$DIRECTORY/}"
    
    if ! grep -q "$rel_path" "$INDEX_FILE"; then
        echo "  ⚠️ Unindexed file: $rel_path"
        UNINDEXED_COUNT=$((UNINDEXED_COUNT + 1))
    fi
done

if [ $UNINDEXED_COUNT -eq 0 ]; then
    echo "  ✅ All files are indexed"
fi

echo ""
echo "📊 Consistency Report:"
echo "  Orphan references: $ORPHAN_COUNT"
echo "  Unindexed files: $UNINDEXED_COUNT"

if [ $ORPHAN_COUNT -eq 0 ] && [ $UNINDEXED_COUNT -eq 0 ]; then
    echo "  ✅ 100% consistency"
    exit 0
else
    echo "  ❌ Inconsistencies detected"
    exit 1
fi
