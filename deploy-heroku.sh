#!/bin/bash

# Exit on error
set -e

# Check for Heroku CLI
if ! command -v heroku &> /dev/null
then
    echo "Heroku CLI not found. Please install it first."
    exit 1
fi

# Login to Heroku (if not already logged in)
heroku whoami &> /dev/null || heroku login

# Create Procfile if it doesn't exist
if [ ! -f Procfile ]; then
    echo 'web: npx tsx src/index.ts --org-mode --http $PORT --enabled-tools "chat|channel|team"' > Procfile
    echo "Created Procfile."
fi

# Run generate script to ensure latest Graph client is built
echo "Running npm run generate to build latest Graph client..."
npm run generate

# Set Heroku remote to existing app 'microsoft-teams-mcp'
heroku git:remote -a microsoft-teams-mcp

# Ensure Node.js buildpack is set
heroku buildpacks:set heroku/nodejs -a microsoft-teams-mcp || true

# Commit Procfile if needed
if [ -n "$(git status --porcelain Procfile)" ]; then
    git add Procfile
    git commit -m "Update Procfile for Heroku deployment"
fi

# Commit generated files if needed
if [ -n "$(git status --porcelain src/generated/)" ]; then
    git add src/generated/
    git commit -m "Update generated Graph client files"
fi

# Commit package.json if needed (for tsx dependency)
if [ -n "$(git status --porcelain package.json)" ]; then
    git add package.json
    git commit -m "Add tsx dependency for TypeScript execution"
fi

# Set the branch to deploy
BRANCH_TO_DEPLOY="main"

# Push to Heroku
git push heroku $BRANCH_TO_DEPLOY:main

echo "Deployment to Heroku app 'microsoft-teams-mcp' initiated."