# aether — Governance

aether is the Commerce colony (archetype: commerce) of the Sovereign Hive
federation. This file is a short, colony-local pointer into the
federation-wide governance convention defined in
[TehutiRaEl/THEHIVE](https://github.com/TehutiRaEl/THEHIVE/blob/claude/session-continuation-owj5wr/docs/GOVERNANCE.md).

## Principles

Contributions here favor reviewable, single-purpose commits; no destructive
operation (deleting data, force-pushing, dropping schema) happens without
explicit human confirmation; and any change that affects the colony's
public `/colony/*` contract, billing, or licensing logic gets a human
reviewer before merge, in line with the federation-wide principles in
THEHIVE's `docs/GOVERNANCE.md`.

## Relevant Roles

The full 101-role catalog lives in
[THEHIVE/docs/ROLES.md](https://github.com/TehutiRaEl/THEHIVE/blob/claude/session-continuation-owj5wr/docs/ROLES.md).
Roles most relevant to this repo:

| # | Role Title | Responsibility |
|---|---|---|
| 10 | Commerce Colony Director | Owns aether's licensing/commerce roadmap. |
| 22 | Frontend UX Lead (aether, 4DBRAIN) | Owns shared UI/UX conventions across web frontends. |
| 36 | Frontend Component Director (aether, 4DBRAIN) | Owns reusable component conventions. |
| 59 | Commerce Architect | Owns licensing/payment architecture. |
| 63 | Frontend Staff Engineer (aether, 4DBRAIN) | Owns shared component/state architecture. |
| 71 | Frontend Engineer (aether) | Implements UI components and pages. |
| 77 | Test Engineer (aether, automatisch) | Writes/maintains frontend/integration test coverage. |
| 85 | Code Reviewer Apprentice (aether) | Performs first-pass PR review. |

## Commit / PR Convention

```
[ROLE: <Role Title>] type(scope): description

Rationale: <one sentence on why this change is needed>
```

`type` follows Conventional Commits (`feat`/`fix`/`docs`/`chore`/`refactor`/`test`).

## Enforcement

Advisory only — see `.github/workflows/governance-check.yml`. It never
fails the build and is not a required status check.
