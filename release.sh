#!/bin/bash

UPSTREAM_URL='git@github.com:TNG/momo-scheduler.git'
# default: not dry-run
DRY_RUN=0
UPSTREAM_BRANCH=main

set -eu

for arg in "$@"; do
  case $arg in
    --version=*)
      VERSION="${1#*=}"
      VERSION_PREFIXED="v${1#*=}"
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    *)
      printf "***************************\n"
      printf "* Error: Invalid argument.*\n"
      printf "***************************\n"
      exit 1
  esac
  shift
done

if [[ ! $VERSION =~ ^[0-9]*\.[0-9]*\.[0-9]*(-[a-zA-Z0-9]*(\.[0-9]*)?)?$ ]]; then
    echo "You have to provide a version as first parameter (without v-prefix, e.g. 0.14.0)"
    exit 1
fi

GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! $GIT_BRANCH =~ $UPSTREAM_BRANCH ]]; then
    echo "You do not seem to be on the $UPSTREAM_BRANCH branch!"
    exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "You have local changes!"
    if [[ $DRY_RUN = 0 ]]; then
      exit 1
    fi
fi

git pull "$UPSTREAM_URL" "$UPSTREAM_BRANCH"

echo "Checking version in package.json"
if [ -z "$(sed -n -e "/\"version\": \"${VERSION}\"/ p" package.json)" ]; then
    echo "Version in package.json is not $VERSION!"
    exit 1
fi

if [[ $DRY_RUN = 1 ]]; then
  echo "Releasing version $VERSION (dry-run)"
else
  echo "Releasing version $VERSION"
fi

npm ci

echo "Linting, building and testing"
npm run lint
npm run build
npm run test

echo "Creating release tag"
git tag -am "$VERSION_PREFIXED" "$VERSION_PREFIXED"

if [[ $DRY_RUN = 1 ]]; then
  echo "Pushing tag to GitHub repository (dry-run)"
  git push "$UPSTREAM_URL" "$VERSION_PREFIXED" --dry-run
else
  echo "Pushing tag to GitHub repository"
  git push "$UPSTREAM_URL" "$VERSION_PREFIXED"
fi

if [[ $DRY_RUN = 1 ]]; then
  echo "Publish to npmjs (dry-run)"
  npm publish --access public --registry https://registry.npmjs.org/ --dry-run
else
  echo "Publish to npmjs"
  npm publish --access public --registry https://registry.npmjs.org/
fi

if [[ $DRY_RUN = 1 ]]; then
  echo "Run this command to clean up: git tag -d $VERSION_PREFIXED"
fi