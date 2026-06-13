#!/bin/bash
# archive-session.sh
# Archives a session folder
# Usage: ./archive-session.sh <session-path>

set -e

SESSION_PATH="$1"
ARCHIVE_DIR="knowledge/sessions/archive"

if [ -z "$SESSION_PATH" ]; then
    echo "Usage: ./archive-session.sh <session-path>"
    echo "Example: ./archive-session.sh knowledge/sessions/test-distill-20260613"
    exit 1
fi

if [ ! -d "$SESSION_PATH" ]; then
    echo "❌ Session directory not found: $SESSION_PATH"
    exit 1
fi

SESSION_NAME=$(basename "$SESSION_PATH")
NOTES_FILE="$SESSION_PATH/notes.md"

echo "📦 Archiving session: $SESSION_NAME"

# Step 1: Create archive directory if not exists
if [ ! -d "$ARCHIVE_DIR" ]; then
    mkdir -p "$ARCHIVE_DIR"
    echo "  ✅ Created archive directory: $ARCHIVE_DIR"
fi

# Step 2: Update notes.md status
if [ -f "$NOTES_FILE" ]; then
    if grep -q "status: active" "$NOTES_FILE"; then
        sed -i '' 's/status: active/status: archived/' "$NOTES_FILE"
        echo "  ✅ Updated notes.md status: active → archived"
    else
        echo "  ⚠️ notes.md status is not 'active', skipping update"
    fi
else
    echo "  ⚠️ notes.md not found, skipping status update"
fi

# Step 3: Move session to archive
if [ -d "$ARCHIVE_DIR/$SESSION_NAME" ]; then
    echo "  ⚠️ Session already archived: $ARCHIVE_DIR/$SESSION_NAME"
    exit 0
fi

mv "$SESSION_PATH" "$ARCHIVE_DIR/$SESSION_NAME"
echo "  ✅ Moved to: $ARCHIVE_DIR/$SESSION_NAME"

echo ""
echo "✅ Session archived successfully"
echo "Session: $SESSION_NAME"
echo "Location: $ARCHIVE_DIR/$SESSION_NAME"
