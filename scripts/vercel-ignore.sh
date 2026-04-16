#!/bin/bash

# 1. Always build pushes to the production branch (main)
if [ "$VERCEL_ENV" == "production" ]; then
  echo "✅ Production push detected. Proceeding with build."
  exit 1
fi

# 2. Only build if it's a Pull Request AND targeting the 'develop' branch
if [[ -n "$VERCEL_GIT_PULL_REQUEST_ID" && "$VERCEL_GIT_COMMIT_REF" == "develop" ]]; then
  echo "✅ PR against develop detected. Proceeding with build."
  exit 1
fi

# 3. Skip everything else
echo "🛑 Build ignored: Not production or a PR against develop."
exit 0