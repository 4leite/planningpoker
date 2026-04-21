# Metadata policy

Use this policy for branch names, commit summaries, PR titles, and PR bodies.

## Core rule

- Summarise the work that has already happened.
- Do not describe workflow mechanics (for example: "finalise", "update PR", "latest changes").

## Scope

- Normal working branch names are user-controlled; do not rename them just to improve wording.
- When a workflow creates a fresh branch, use an outcome-focused slug.
- Commit summaries, PR titles, and PR bodies should all describe the same completed work at
  different levels of detail.

## Style

- Keep metadata concise and freeform.
- Prefer user-visible outcomes when possible.
- Prefer factual wording over hype.
- Do not claim validation or follow-up work that did not happen.

## Branch names

- If a skill creates a fresh branch, make the slug describe the work area and outcome.
- For the finalise workflow, use `finalise/<timestamp>-<work-slug>`.
- Avoid process slugs such as `update-pr`, `latest-changes`, or `wip`.

## Commit summaries

- Keep commit summaries extremely brief.
- Summarise the completed outcome, not the implementation process.
- Avoid mechanical prefixes unless the repo or user explicitly asks for them.

## PR titles and bodies

- PR titles may be slightly broader than the commit summary, but should still describe completed
  work.
- Keep the PR body to one sentence unless a workflow explicitly needs more.
- If the work closes an issue, add a closing reference such as `Closes #123`.
- Validation status belongs in status reporting, not in the metadata itself, unless the user
  explicitly wants it in the PR body.

## Inputs

- Use available context to infer the summary (diff, commits, current tree state).
- No rigid source ordering is required.
- Prefer the net effect of the current tree over intermediate workflow steps.

## Generation behavior

- Always generate metadata; do not pause to ask for wording.
- Use a one-sentence summary for the PR body.
- If the work closes an issue, mention it in the PR body using an issue-closing reference (for
  example: `Closes #123`).

## Avoid

- "finalise room flow"
- "update PR with latest changes"
- "misc fixes"
- "WIP"

## Prefer

- "Thin room server write paths"
- "Keep room history reveal server-side"
- "Document SPA thin-server refactor progress"
