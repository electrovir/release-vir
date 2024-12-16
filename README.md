# release-vir

A GitHub Action for automatically generating a release on GitHub for version tags.

# Usage

1. Setup a GitHub workflow like this:

    ```yaml
    name: 'tagged-release'

    on:
        push:
            tags:
                - 'v*'

    permissions:
        contents: write

    concurrency:
        group: ${{ github.workflow }}-${{ github.ref }}
        cancel-in-progress: true

    jobs:
        tagged-release:
            name: 'Tagged Release'
            runs-on: 'ubuntu-latest'

            steps:
                - uses: actions/checkout@v4.1.7
                with:
                    fetch-depth: 0
                - uses: actions/setup-node@v4.0.3
                with:
                    node-version-file: '.nvmrc'
                    cache: 'npm'
                - uses: electrovir/release-vir@dev
    ```

2. Use `git tag` to add version tags with the `v` prefix to your commits.

    Example: `git tag v0.0.2`.

3. Run `git push --tags` to push your tags to GitHub, triggering the above workflow.
