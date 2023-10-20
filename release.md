# How to release

1. Trigger `Prepare Release From main` workflow
2. Open pull request from newly created branch `v{version}-release` to `main`
3. Update the changelog and push it to the branch
4. This push triggers the `Update THIRD_PARTY_NOTICE` workflow which will update the third party notice on the release branch
5. Review the PR
6. Merge the PR
7. Run the `release.sh` script on latest `main` (first check with `--dry-run` option) with the version set: `./release.sh --version={version} --dry-run`

Check the new version on https://www.npmjs.com/package/@tngtech/momo-scheduler
