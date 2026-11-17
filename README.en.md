# dsh-department — AI development department for DeepSeek Harness

A department of AI agents with a manager and specialists that takes a task from idea to release:
analysis → concept (human approval) → specification (human approval) → plan → per-stage
implementation with tests and independent review → commit, tag and push per stage.

## Features

- Task board, task card (documents, questions, audit, events, corrections, roles, budget, git).
- Human gates: only a human approves concept and spec; memos and corrections come back to the manager.
- Gates per stage: tests + independent review; retries; backlog for out-of-scope work.
- Git discipline: one branch per task, commit + tag + push per stage.
- Budget tracking, roles and limits, pause/resume (only a human can resume).
- Watchdog: wakes the manager on new human input or when a task stalls.
- Pixel office: employees walk, work, rest; sprites reflect real agent activity.
- Release phase: `dept_start release=true` seeds the release checklist (package, docs, QA, tag).

## Install

Requires DeepSeek Harness >= 0.2.0 and Node >= 24.9.

```bash
dsh plugin --profile web add dsh-department
```

or from a local package:

```bash
dsh plugin --profile web add /path/dsh-department-0.1.0.tgz
```

Restart DSH, open the department panel.

## Quick start

1. In a project chat: `dept_start` with `root`, `taskId`, `title`, `brief`.
2. Manager runs analysis and writes concept/spec; approve them in the task card.
3. Team executes the plan stage by stage; each stage ends with tests, review, `dept_verify`, `dept_commit`.
4. Release: `dept_start release=true` (or a separate release task).

## Docs

- `README.md` — full docs (Russian).
- `docs/I18N.md` — localization.
- `docs/RELEASE.md` — release checklist.
- `templates/release.md` — release task template.

## License

MIT.
