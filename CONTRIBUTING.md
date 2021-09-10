# Contributing

Contributions are very welcome. The following will provide some helpful guidelines.

## How to build the project

```
$ cd /path/to/git/clone/of/Momo
$ npm run build
```

## How to contribute

If you want to submit a contribution, please follow the following workflow:

* Fork the project
* Create a feature branch
* Add your contribution
* When you're completely done, build the project and run all tests via `npm run test`
* Create a Pull Request

### Commits

Commit messages should adhere to the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) 
specification. There is a pre-commit hook that will prevent commits that do not do so. 
Commit messages should be clear and fully elaborate the context and the reason of a change.
If your commit refers to an issue, please post-fix it with the issue number, e.g.

```
Issue: #123
```

Furthermore, commits should be signed off according to the [DCO](DCO).

### Pull Requests

If your Pull Request resolves an issue, please add a respective line to the end, like

```
Resolves #123
```

### Formatting

Please adjust your code formatter to the general style of the project or use
```
npm run format
```
to format the code.
