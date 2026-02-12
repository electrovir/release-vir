import {extractErrorMessage, log, pickObjectKeys, wait, wrapInTry} from '@augment-vir/common';
import {listCommitsSinceLastVersion} from './action-steps/list-commits.js';
import {createReleaseBody} from './action-steps/release-body.js';
import {determineVersions} from './action-steps/versions.js';
import {loadActionParams} from './util/action-params.js';
import {logJson} from './util/log-json.js';
import {SilentError} from './util/silent.error.js';

async function runAction() {
    /**
     * Wait because GitHub is slow to update, which causes race conditions with this action being
     * triggered and it reading the data.
     */
    await wait({seconds: 10});

    try {
        const params = loadActionParams();

        log.faint('Action params:');
        logJson(
            pickObjectKeys(params, [
                'includeNpmPack',
                'repo',
                'repoDir',
                'semVersion',
                'tagName',
            ]),
            'faint',
        );

        const {isCurrentLatest, previous} = await determineVersions(params);

        log.faint('Previous version:');
        logJson(previous, 'faint');

        const commits = await listCommitsSinceLastVersion(previous, params);

        log.faint('Commits since previous:');
        logJson(commits, 'faint');

        const existingRelease = await wrapInTry(
            () =>
                params.octokit.rest.repos.getReleaseByTag({
                    owner: params.repo.owner,
                    repo: params.repo.repo,
                    tag: params.tagName,
                }),
            {
                fallbackValue: undefined,
            },
        );

        const releaseBody = createReleaseBody(previous, commits, params);

        const sharedParams = {
            owner: params.repo.owner,
            repo: params.repo.repo,
            tag_name: params.tagName,
            name: params.tagName,
            body: releaseBody,
            make_latest: isCurrentLatest ? 'true' : 'false',
        } as const;

        if (existingRelease) {
            log.faint(`Updating existing release with tag '${params.tagName}'.`);
            await params.octokit.rest.repos.updateRelease({
                ...sharedParams,
                release_id: existingRelease.data.id,
            });
        } else {
            log.faint(`Creating new release with tag '${params.tagName}'.`);
            await params.octokit.rest.repos.createRelease(sharedParams);
        }

        log.faint('');
        log.success('release-vir finished.');
    } catch (error) {
        if (!(error instanceof SilentError)) {
            log.error(extractErrorMessage(error));
        }
        log.faint('');
        log.error('pull-request-vir failed');
        process.exit(1);
    }
}

await runAction();
