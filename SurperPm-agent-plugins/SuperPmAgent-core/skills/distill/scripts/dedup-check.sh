#!/bin/bash
# dedup-check.sh
# Checks for duplicate knowledge files
# Usage: ./dedup-check.sh <keywords> <target-directory>

set -e

KEYWORDS="$1"
TARGET_DIR="$2"

if [ -z "$KEYWORDS" ] || [ -z "$TARGET_DIR" ]; then
    echo "Usage: ./dedup-check.sh <keywords> <target-directory>"
    echo "Example: ./dedup-check.sh \"jwt,token,authentication\" knowledge/domain/authentication"
    exit 1
fi

echo "🔍 Checking for duplicates..."
echo "Keywords: $KEYWORDS"
echo "Target: $TARGET_DIR"
echo ""

# Search for matching files
MATCHES=$(grep -rl "$KEYWORDS" "$TARGET_DIR" 2>/dev/null || true)

if [ -z "$MATCHES" ]; then
    echo "✅ No duplicates found (0 matches)"
    echo "Similarity: 0%"
    echo "Action: CREATE NEW"
    exit 0
fi

echo "📄 Found $(echo "$MATCHES" | wc -l | tr -d ' ') potential matches:"
echo "$MATCHES" | while read file; do
    echo "  - $file"
done

echo ""
echo "⚠️ Manual review required:"
echo "  1. Read the matching files"
echo "  2. Calculate similarity:"
echo "     - Overlapping headings (40%)"
echo "     - Overlapping code examples (40%)"
echo "     - Overlapping keywords (20%)"
echo "  3. Apply decision matrix:"
echo "     - > 70%: SKIP"
echo "     - 50-70%: UPDATE existing"
echo "     - 30-50%: CREATE NEW with different slug"
echo "     - < 30%: CREATE NEW"
