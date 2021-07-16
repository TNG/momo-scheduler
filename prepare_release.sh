#!/bin/bash

UPSTREAM_URL='git@github.com:TNG/momo-scheduler.git'
# default: not dry-run
DRY_RUN=0
UPSTREAM_BRANCH=main

set -eux

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

if [[ ! $VERSION =~ ^[0-9]*\.[0-9]*\.[0-9]*(-[A-Z0-9]*)?$ ]]; then
    echo "You have to provide a version as first parameter (without v-prefix, e.g. 0.14.0)"
    exit 1
fi

GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! $GIT_BRANCH =~ $UPSTREAM_BRANCH ]]; then
    echo "You do not seem to be on the ${UPSTREAM_BRANCH} branch!"
    exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "You have local changes!"
    exit 1
fi

git pull "${UPSTREAM_URL}" "${UPSTREAM_BRANCH}"

RELEASE_BRANCH="${VERSION_PREFIXED}-release"
git branch "$RELEASE_BRANCH"
git checkout "$RELEASE_BRANCH"

if [[ $DRY_RUN ]]; then
  echo "Preparing release of version $VERSION (dry-run)"
else
  echo "Preparing release of version $VERSION"
fi

echo "Updating version in package.json"
sed -i -e "s/\"version\":.*/\"version\":\ \"$VERSION\"\,/" package.json
npm install

echo "Committing version change"
git add package.json
git add package-lock.json
git commit --signoff -m "Update version to $VERSION"

echo "Linting, building and testing"
npm run lint
npm run build
npm run test

echo "Creating Tag"
git tag -a -m "$VERSION_PREFIXED" "$VERSION_PREFIXED"

if [[ $DRY_RUN ]]; then
  echo "Pushing version and tag to GitHub repository (dry-run)"
  git push --set-upstream "$UPSTREAM_URL" "$RELEASE_BRANCH" --dry-run
  git push "$UPSTREAM_URL" "$VERSION_PREFIXED" --dry-run
else
  echo "Pushing version and tag to GitHub repository"
  git push --set-upstream "$UPSTREAM_URL" "$RELEASE_BRANCH"
  git push "$UPSTREAM_URL" "$VERSION_PREFIXED"

  hub pull-request -b "$UPSTREAM_BRANCH" -m "Release version $VERSION"
fi
