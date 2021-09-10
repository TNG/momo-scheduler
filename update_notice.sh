#!/bin/bash

UPSTREAM_URL='git@github.com:TNG/momo-scheduler.git'
UPSTREAM_BRANCH=main
NOTICE_FILENAME=THIRD_PARTY_NOTICE

set -eux

GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! $GIT_BRANCH =~ $UPSTREAM_BRANCH ]]; then
    echo "You do not seem to be on the ${UPSTREAM_BRANCH} branch!"
    exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "You have local changes!"
    exit 1
fi

echo "Running ORT analyzer"
docker run -v $(pwd):/project philipssoftware/ort --info analyze -f JSON -i /project -o /project/ort

echo "Creating ORT report"
docker run -v $(pwd):/project philipssoftware/ort --info report -f StaticHtml,WebApp,Excel,NoticeTemplate,SPDXDocument,GitLabLicensemodel,AsciiDocTemplate,CycloneDx,EvaluatedModel -i /project/ort/analyzer-result.json -o /project/ort

echo "Committing updated ${NOTICE_FILENAME}"
cp $(pwd)/ort/NOTICE_default $(pwd)/${NOTICE_FILENAME}
git add ${NOTICE_FILENAME}
git commit -s -m "chore: update THIRD_PARTY_NOTICE"
