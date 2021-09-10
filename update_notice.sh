#!/bin/bash

UPSTREAM_URL='git@github.com:TNG/momo-scheduler.git'
NOTICE_FILENAME=date.txt #THIRD_PARTY_NOTICE
# default: not dry-run
DRY_RUN=0

set -eux

for arg in "$@"; do
  case $arg in
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

RELEASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! $RELEASE_BRANCH =~ ^v[0-9]*\.[0-9]*\.[0-9]*(-[A-Z0-9]*)?-release ]]; then
    echo "You do not seem to be on a release branch!"
   # exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "You have local changes!"
    exit 1
fi

if [[ $DRY_RUN = 1 ]]; then
  date > $NOTICE_FILENAME
else
  echo "Running ORT analyzer"
  docker run -v "$(pwd)":/project philipssoftware/ort --info analyze -f JSON -i /project -o /project/ort

  echo "Creating ORT report"
  docker run -v "$(pwd)":/project philipssoftware/ort --info report -f StaticHtml,WebApp,Excel,NoticeTemplate,SPDXDocument,GitLabLicensemodel,AsciiDocTemplate,CycloneDx,EvaluatedModel -i /project/ort/analyzer-result.json -o /project/ort

  cp ort/NOTICE_default ${NOTICE_FILENAME}
fi

echo "Created ${NOTICE_FILENAME}:"
head ${NOTICE_FILENAME}

echo "Committing updated ${NOTICE_FILENAME}"
git add ${NOTICE_FILENAME}

if [[ $DRY_RUN = 1 ]]; then
  git commit -s -m "chore: update THIRD_PARTY_NOTICE (dry-run)" --dry-run
  git push "$UPSTREAM_URL" "$RELEASE_BRANCH" --dry-run
else
  git commit -s -m "chore: update THIRD_PARTY_NOTICE"
  git push "$UPSTREAM_URL" "$RELEASE_BRANCH"
fi