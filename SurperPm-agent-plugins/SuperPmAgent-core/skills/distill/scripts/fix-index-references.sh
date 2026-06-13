#!/bin/bash
# fix-index-references.sh
# Fixes orphan references and adds unindexed files to INDEX.md
# Usage: ./fix-index-references.sh <directory> <action> <file-list>

set -e

DIRECTORY="$1"
ACTION="$2"  # "remove-orphans" or "add-unindexed"
shift 2
FILES=("$@")

INDEX_FILE="$DIRECTORY/INDEX.md"

if [ -z "$DIRECTORY" ] || [ -z "$ACTION" ]; then
    echo "Usage: ./fix-index-references.sh <directory> <action> [files...]"
    echo "Actions:"
    echo "  remove-orphans <file1> <file2> ...  - Remove orphan references from INDEX.md"
    echo "  add-unindexed <file1> <file2> ...   - Add unindexed files to INDEX.md"
    exit 1
fi

if [ ! -f "$INDEX_FILE" ]; then
    echo "❌ INDEX.md not found: $INDEX_FILE"
    exit 1
fi

if [ ${#FILES[@]} -eq 0 ]; then
    echo "⚠️ No files specified"
    exit 0
fi

echo "🔧 Fixing INDEX.md in: $DIRECTORY"
echo "Action: $ACTION"
echo "Files: ${#FILES[@]}"
echo ""

if [ "$ACTION" = "remove-orphans" ]; then
    # Remove orphan references from INDEX.md
    for orphan in "${FILES[@]}"; do
        # Extract just the filename from the path
        filename=$(basename "$orphan")
        
        if grep -q "$filename" "$INDEX_FILE"; then
            # Remove the line containing this reference
            sed -i '' "/$filename/d" "$INDEX_FILE"
            echo "  ✅ Removed orphan reference: $orphan"
        else
            echo "  ⚠️ Reference not found in INDEX.md: $orphan"
        fi
    done

elif [ "$ACTION" = "add-unindexed" ]; then
    # Add unindexed files to INDEX.md
    for unindexed in "${FILES[@]}"; do
        if [ ! -f "$unindexed" ]; then
            echo "  ⚠️ File not found: $unindexed"
            continue
        fi
        
        # Extract metadata from frontmatter
        name=$(grep '^name:' "$unindexed" | head -1 | cut -d' ' -f2- || echo "unknown")
        type=$(grep '^type:' "$unindexed" | head -1 | cut -d' ' -f2- || echo "unknown")
        confidence=$(grep '^confidence:' "$unindexed" | head -1 | cut -d' ' -f2- || echo "0.5")
        
        # Get relative path
        rel_path="${unindexed#$DIRECTORY/}"
        
        # Determine section (foundations/conventions/context)
        section=$(echo "$rel_path" | cut -d'/' -f1)
        
        # Find the section table in INDEX.md and add entry
        # This is a simplified version - in practice, you'd want to find the right table
        echo "| $name | [$rel_path]($rel_path) | Auto-indexed | $confidence |" >> "$INDEX_FILE"
        
        echo "  ✅ Added to INDEX: $rel_path (type=$type, confidence=$confidence)"
    done
else
    echo "❌ Unknown action: $ACTION"
    echo "Valid actions: remove-orphans, add-unindexed"
    exit 1
fi

# Update INDEX.md timestamp
sed -i '' 's/> \*\*Updated\*\*: .*/> **Updated**: '"$(date +%Y-%m-%d)"'/' "$INDEX_FILE"
echo ""
echo "✅ INDEX.md updated (timestamp: $(date +%Y-%m-%d))"
