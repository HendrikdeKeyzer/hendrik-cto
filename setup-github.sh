#!/bin/bash

# Setup GitHub Remote for Hendrik CTO Project

echo "🏗️  Hendrik CTO — GitHub Setup"
echo "======================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Run: git init"
    exit 1
fi

# Ask for GitHub username/repo
read -p "GitHub username (or org): " GH_USER
read -p "Repository name (default: hendrik-cto): " GH_REPO
GH_REPO=${GH_REPO:-hendrik-cto}

# Set remote
REMOTE_URL="git@github.com:${GH_USER}/${GH_REPO}.git"

echo ""
echo "Adding remote: $REMOTE_URL"
git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"

# Initial commit
echo ""
echo "Creating initial commit..."
git add -A
git commit -m "Initial commit: CTO briefing, tasks, project structure" || echo "Already committed"

# Push
echo ""
echo "Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Done! Repository is at: https://github.com/${GH_USER}/${GH_REPO}"
echo ""
echo "Next steps:"
echo "1. Enable GitHub Pages in repo settings"
echo "2. Add GitHub secrets: ENTSO_E_API_KEY, STRIPE_KEY, etc."
echo "3. Claude Code can now clone and work: git clone $REMOTE_URL"
