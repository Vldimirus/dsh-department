import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { amendCommit, commitAll, currentBranch, ensureBranch, isRepo, push, runGit, tag } from '../src/git.js';

async function tempRepo(t) {
  const root = await mkdtemp(join(tmpdir(), 'dept-git-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await runGit(root, ['init', '-q']);
  await runGit(root, ['config', 'user.name', 'Dept Test']);
  await runGit(root, ['config', 'user.email', 'dept@test.local']);
  await writeFile(join(root, 'README.md'), '# test\n', 'utf8');
  return root;
}

test('isRepo: распознаёт git-репозиторий', async (t) => {
  const root = await tempRepo(t);
  assert.equal(await isRepo(root), true);
  assert.equal(await isRepo(tmpdir()), false);
});

test('ensureBranch: создаёт и переиспользует ветку', async (t) => {
  const root = await tempRepo(t);
  const created = await ensureBranch(root, 'dept/x');
  assert.equal(created.ok, true);
  assert.equal(created.created, true);
  assert.equal(await currentBranch(root), 'dept/x');
  const again = await ensureBranch(root, 'dept/x');
  assert.equal(again.created, false);
});

test('commitAll/tag: коммит и тег создаются', async (t) => {
  const root = await tempRepo(t);
  const committed = await commitAll(root, 'test: commit');
  assert.equal(committed.ok, true);
  assert.ok(committed.commit);
  const tagged = await tag(root, 'stage-1');
  assert.equal(tagged.ok, true);
  const tags = await runGit(root, ['tag']);
  assert.match(tags.stdout, /stage-1/);
});

test('commitAll: повторный коммит без изменений не падает', async (t) => {
  const root = await tempRepo(t);
  await commitAll(root, 'first');
  const second = await commitAll(root, 'second');
  assert.equal(second.ok, true);
});

test('amendCommit: незакоммиченное изменение входит в последний коммит', async (t) => {
  const root = await tempRepo(t);
  await commitAll(root, 'first');
  await writeFile(join(root, 'state.json'), '{"a":1}\n', 'utf8');
  const amended = await amendCommit(root);
  assert.equal(amended.ok, true);
  assert.equal(amended.amended, true);
  const status = await runGit(root, ['status', '--porcelain']);
  assert.equal(status.stdout.trim(), '');
  const files = await runGit(root, ['show', '--name-only', '--pretty=format:', 'HEAD']);
  assert.match(files.stdout, /state.json/);
});

test('push: с tags отправляет легковесные теги в bare-репозиторий', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dept-push-'));
  const bare = await mkdtemp(join(tmpdir(), 'dept-push-bare-'));
  try {
    await runGit(root, ['init', '-q']);
    await runGit(root, ['config', 'user.name', 'Push Test']);
    await runGit(root, ['config', 'user.email', 'push@test.local']);
    await runGit(root, ['checkout', '-qb', 'dept/x']);
    await writeFile(join(root, 'a.txt'), 'a', 'utf8');
    await runGit(root, ['add', '-A']);
    await runGit(root, ['commit', '-qm', 'first']);
    await runGit(root, ['tag', 'stage-1']);
    await runGit(bare, ['init', '--bare', '-q']);
    const pushed = await push(root, bare, 'dept/x', { tags: true });
    assert.equal(pushed.ok, true);
    const tags = await runGit(bare, ['tag', '-l']);
    assert.match(tags.stdout, /stage-1/);
    const log = await runGit(bare, ['log', '--oneline', 'dept/x']);
    assert.match(log.stdout, /first/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(bare, { recursive: true, force: true });
  }
});
