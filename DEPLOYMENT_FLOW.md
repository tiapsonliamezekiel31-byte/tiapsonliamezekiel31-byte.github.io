# Deployment Flow

Use this file as instructions for an AI or operator to update and deploy the app from this workspace.

## Parameters 
- branch: main
- bump_sw: true|false        # set true to bump `sw.js` cache name
- sw_tag: auto|YYYYMMDD-HHMM # use `auto` to generate timestamp tag
- build_cmd: npm run build   # or empty if none
- commit_msg: [brief message]
- trigger_pages_rebuild: true|false
- poll_live_sw_secs: 0|30    # 0 = skip polling; >0 = poll until live `sw.js` shows new tag (secs between attempts)
- confirm_before_push: true|false

## Steps

1. Show current Git branch and uncommitted changes.
2. If there are uncommitted changes, stage and commit using `commit_msg` (or report and stop if none provided).
3. If `bump_sw` is true:
   - Update `sw.js` `CACHE_NAME` to include `sw_tag` (generate if `auto`).
   - Stage the change.
4. If `build_cmd` is provided, run it and stage any built output changes.
5. If `confirm_before_push` is true, ask for confirmation before pushing; otherwise push to `origin/<branch>`.
6. If push fails due to remote updates, perform `git pull --rebase origin <branch>`, resolve trivial rebase (abort on conflicts and report), then push.
7. If `trigger_pages_rebuild` is true, create an empty commit `ci: trigger pages rebuild` and push.
8. Verification:
   - Show last 5 commits on local and `origin/<branch>`.
   - Fetch raw repo file `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/sw.js` and show `CACHE_NAME`.
   - Fetch live Pages `https://<owner>.github.io/<repo>/sw.js` and show `CACHE_NAME`.
   - If `poll_live_sw_secs` > 0, poll the live Pages `sw.js` every `poll_live_sw_secs` seconds up to 5 minutes until the `CACHE_NAME` matches the repo raw file, then report success/failure.
9. Output:
   - Files changed and diff summary.
   - Commands run and their results (succinct).
   - Clear next steps for users/devices to force-update clients: uninstall PWA, clear site data, cache-buster URL.

## Safety

- Never force-push without explicit approval.
- If a rebase/merge conflict occurs, stop and show the conflict summary; do not attempt automatic conflict resolution.

## Workspace notes

- Use the workspace files directly, especially `sw.js`, `JS/ui.js`, and `JS/popups.js`.
- Run commands in the project root.
- Report progress after each major step.
