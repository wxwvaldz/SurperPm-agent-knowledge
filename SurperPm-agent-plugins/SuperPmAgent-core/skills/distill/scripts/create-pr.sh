#!/bin/bash
# create-pr.sh
# Creates a PR using gh CLI with error handling
# Usage: ./create-pr.sh <branch> <title> <body-file>

set -e

BRANCH="$1"
TITLE="$2"
BODY_FILE="$3"

# Pre-flight checks
echo "🔧 Pre-flight checks..."

# Check remote
if ! git remote -v | grep -q origin; then
    echo "❌ No remote 'origin' configured"
    echo "Run: git remote add origin <url>"
    exit 1
fi

# Check gh CLI
if ! command -v gh &> /dev/null; then
    echo "❌ gh CLI not installed"
    echo "Install: brew install gh"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

# Check there are changes
if git diff --cached --quiet && git diff --quiet; then
    echo "⚠️ No changes to commit"
    echo "Distillation produced no new artifacts"
    exit 0
fi

echo "✅ Pre-flight checks passed"
echo ""

# Branch creation
echo "🌿 Creating/switching to branch: $BRANCH"
if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
    echo "  ⚠️ Branch already exists, appending changes"
    git checkout "$BRANCH"
else
    git checkout -b "$BRANCH"
fi

echo ""

# Commit and push
echo "📦 Committing changes..."
git add .
git commit -m "$TITLE" || {
    echo "⚠️ No changes to commit (all files unchanged)"
    exit 0
}

echo "📤 Pushing to remote..."
if ! git push origin "$BRANCH"; then
    echo "❌ Push failed"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Run 'git remote -v' to verify remote"
    echo "  2. Try 'git push' manually"
    exit 1
fi

echo ""

# Create PR
echo "🎯 Creating PR..."
if gh pr create \
    --title "$TITLE" \
    --body-file "$BODY_FILE" \
    --base main \
    --head "$BRANCH"; then
    echo ""
    echo "✅ PR created successfully!"
    echo "Branch: $BRANCH"
else
    echo "❌ PR creation failed"
    echo ""
    echo "Manual steps:"
    echo "  1. Branch '$BRANCH' has been pushed"
    echo "  2. Go to https://github.com/$(git remote get-url origin | sed 's|.*:||;s|\.git$||')/pulls"
    echo "  3. Click 'New pull request'"
    echo "  4. Select branch '$BRANCH'"
    echo "  5. Copy PR body from $BODY_FILE"
    exit 1
fi
