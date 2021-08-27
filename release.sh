#!/bin/bash

DRY_RUN=0

set -e

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
if [[ ! $GIT_BRANCH =~ main ]]; then
    echo "You do not seem to be on the main branch!"
    exit 1
fi

echo Releasing version "$VERSION"

echo Updating version in package.json ...
sed -i -e "s/\"version\":.*/\"version\":\ \"$VERSION\"\,/" package.json
npm install

if [ -n "$(git status --porcelain)" ]; then
    echo Commiting version change
    git add package.json
    git add package-lock.json
    git commit --signoff -m "Update version to $VERSION"
fi

echo Linting, building and testing:
npm run lint
npm run build
npm run test

echo Creating Tag...
git tag -a -m "$VERSION_PREFIXED" "$VERSION_PREFIXED"

if [[ $DRY_RUN ]]; then
  echo "Pushing version and tag to GitHub repository (dry-run)":
  git push --dry-run
  git push "$(git config --get remote.origin.url)" "$VERSION_PREFIXED" --dry-run

  echo "Publish to npmjs (dry-run):"
  npm publish --access public --registry https://registry.npmjs.org/ --dry-run
else
  echo "Pushing version and tag to GitHub repository:"
  git push
  git push "$(git config --get remote.origin.url)" "$VERSION_PREFIXED"

  echo "Publish to npmjs:"
  npm publish --access public --registry https://registry.npmjs.org/
fi
