# How to release

1. Trigger `Prepare Release From main` workflow
2. Open pull request from newly created branch `v{version}-release` to `main`
3. The `Update THIRD_PARTY_NOTICE` workflow will run and update the third party notice on the release branch
4. Make sure that the Changelog is updated
5. Review the PR
6. Merge the PR
7. Run the `release.sh` script on latest `main` (first check with `--dry-run` option)

Check the new version on https://www.npmjs.com/package/@tngtech/momo-scheduler
