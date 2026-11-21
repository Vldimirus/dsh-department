/**
 * HTTP-маршруты Web-панели отдела на общем канале `/api`.
 * Только чтение: доска и карточка задачи.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listProjects, listTasks, resolveRoots, rootsWithTasks, taskPayload } from './panel-api.js';
import { createDepartmentTask } from './create-task.js';
import { encodePng } from './png.js';
import { assertApprovalReady } from './approval.js';
import { isGitProject, listDirectories } from './browse-dirs.js';
import { addDesignFeedback } from './store.js';
import { readSettings, writeSettings } from './settings.js';
import { randomUUID } from 'node:crypto';
import { rename } from 'node:fs/promises';
import { addCorrection, amendDocument, answerQuestion, approveDocument, listRoles, advanceStage, readState, reopenTask, reviewMemo, setBudget, setPaused, setRole, writeState } from './store.js';
import { isHumanApprover } from './roles.js';
import { buildBlueprint } from './blueprint.js';
import { listDocuments, readDocument } from './documents.js';

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');


/**
 * Будит руководителя в проекте или создаёт для него чат.
 *
 * @param {object} ctx Контекст плагина.
 * @param {string} root Корень.
 * @param {string} taskId Задача.
 * @param {string} title Название.
 * @returns {Promise<string|null>} id сессии.
 */
async function startManager(ctx, root, taskId, title, text) {
  const kickoff = text || `Ты — руководитель ИИ-отдела. Задача ${taskId} («${title}») в ${root}.
Прочитай docs/department/${taskId}/task.md и начни с ОБСУЖДЕНИЯ:
задай 4–6 вопросов через dept_ask, запиши dept_discussion, затем подготовь ТЗ и концепцию
(2–3 варианта). Не утверждай документы и не пиши код — утверждает человек в панели.`;
  try {
    const registry = ctx.get('agents');
    const existing = registry.list().find((agent) => agent?.session?.header?.cwd === root && typeof agent.followup === 'function');
    if (existing) {
      existing.followup({ role: 'user', content: [{ type: 'text', text: kickoff }], source: { kind: 'dsh-department' } });
      return existing.id ?? null;
    }
    const sessionId = `session-${randomUUID()}`;
    const handle = await registry.create({ sessionId, meta: { cwd: root, agentPreset: 'standard' } });
    handle.agent.followup({ role: 'user', content: [{ type: 'text', text: kickoff }], source: { kind: 'dsh-department' } });
    return sessionId;
  } catch {
    return null;
  }
}


/**
 * Промт руководителю по текущей стадии.
 *
 * @param {object} state Состояние.
 * @param {string} root Корень.
 * @param {string} taskId Задача.
 * @returns {string}
 */
function promptFor(state, root, taskId) {
  const base = `Задача ${taskId} в ${root}. Стадия: ${state.stage}.`;
  switch (state.stage) {
    case 'analysis':
      return `${base}\nПрочитай docs/department/${taskId}/task.md и начни с ОБСУЖДЕНИЯ: 4–6 вопросов через dept_ask, discussion.md, затем ТЗ и концепция. Не утверждай и не пиши код.`;
    case 'spec':
      return `${base}\nПодготовь ТЗ (spec.md): требования, НФТ, критерии приёмки, границы. Затем dept_stage spec_review и жди утверждения человеком.`;
    case 'spec_review':
      return `${base}\nТЗ готово к утверждению человеком. Дождись решения; после утверждения — концепция (2–3 варианта).`;
    case 'concept':
      return `${base}\nСделай концепцию (concept.md): 2–3 варианта, плюсы/минусы, выбор, архитектура. Затем dept_stage concept_review и жди утверждения.`;
    case 'concept_review':
      return `${base}\nКонцепция готова к утверждению человеком. Дождись решения.`;
    case 'design':
      return `${base}\nСобери design.md: 3+ референса со ссылками (web_search/web_fetch), палитра, типографика, сетка, макет главного экрана, антипаттерны. Сложи references/ и переведи в design_review. Код не пиши.`;
    case 'design_review':
      return `${base}\nДизайн готов к утверждению человеком. Дождись решения; после утверждения — plan.md и этапы.`;
    case 'executing':
      return `${base}\nСоставь план (plan.md), если его нет, затем веди этапы: реализация → тесты → ревью → dept_commit. Проверяй dept_health.`;
    case 'release':
      return `${base}\nСобери пакет передачи: dept_handover (RUN.md, MANUAL-QA.md, CHANGELOG.md), dept_verify, затем dept_stage done.`;
    default:
      return `${base}\nПродолжай по процессу отдела.`;
  }
}

/** Точные маршруты панели. */
export const DEPARTMENT_ROUTES = {
  tasks: '/api/department/tasks',
  task: '/api/department/task',
  activity: '/api/department/activity',
  asset: '/api/department/asset',
  approve: '/api/department/approve',
  blueprint: '/api/department/blueprint',
  roles: '/api/department/roles',
  projects: '/api/department/projects',
  review: '/api/department/review',
  correction: '/api/department/correction',
  pause: '/api/department/pause',
  settings: '/api/department/settings',
  createTask: '/api/department/task/create',
  editor: '/api/department/editor',
  editorSave: '/api/department/editor/save',
  editorHandoff: '/api/department/editor/handoff',
  browseDirs: '/api/department/browse-dirs',
  taskDelete: '/api/department/task/delete',
  taskStart: '/api/department/task/start',
  reopen: '/api/department/task/reopen',
  toDesign: '/api/department/task/to-design',
  design: '/api/department/design',
  designImage: '/api/department/design/image',
  designFeedback: '/api/department/design/feedback',
  documents: '/api/department/documents',
  document: '/api/department/document',
  answer: '/api/department/answer',
  amend: '/api/department/amend',
  budget: '/api/department/budget',
};

/**
 * Регистрирует маршруты панели.
 *
 * @param {object} ctx Контекст плагина.
 * @returns {{ registered: string[], dispose: () => void }}
 */
export function registerDepartmentRoutes(ctx, activity) {
  const registered = [];
  const disposers = [];
  const connection = ctx.get('connection');
  if (!connection?.fetch?.register) {
    ctx.logger?.warn?.('department: сервис connection недоступен, панель не зарегистрирована (инструменты работают)');
    return { registered, dispose() {} };
  }

  const add = (route) => {
    try {
      const dispose = connection.fetch.register({
        ...route,
        fetch: async (request) => {
          try {
            return await route.fetch(request);
          } catch (error) {
            return Response.json(
              { error: error instanceof Error ? error.message : String(error) },
              { status: 500 },
            );
          }
        },
      });
      if (typeof dispose === 'function') disposers.push(dispose);
      registered.push(route.path);
    } catch (error) {
      ctx.logger?.warn?.(`department: не удалось зарегистрировать ${route.path}: ${error?.message ?? error}`);
    }
  };

  add({
    path: DEPARTMENT_ROUTES.tasks,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      const roots = resolveRoots(ctx, url.searchParams.get('root'));
      return Response.json({ roots, tasks: await listTasks(roots) });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.documents,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      const root = url.searchParams.get('root');
      const taskId = url.searchParams.get('taskId');
      if (!root || !taskId) return Response.json({ error: 'root, taskId required' }, { status: 400 });
      try {
        return Response.json({ documents: await listDocuments(root, taskId) });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.document,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      const root = url.searchParams.get('root');
      const taskId = url.searchParams.get('taskId');
      const path = url.searchParams.get('path');
      if (!root || !taskId || !path) return Response.json({ error: 'root, taskId, path required' }, { status: 400 });
      try {
        return Response.json({ path, content: await readDocument(root, taskId, path) });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.settings,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      if (request.method === 'GET') return Response.json(await readSettings());
      const body = await request.json().catch(() => ({}));
      const { enabled, by } = body ?? {};
      if (typeof enabled !== 'boolean' || !isHumanApprover(by)) {
        return Response.json({ error: 'enabled boolean and human signature required' }, { status: 400 });
      }
      const next = await writeSettings({ enabled });
      return Response.json(next);
    },
  });

  add({
    path: DEPARTMENT_ROUTES.createTask,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, title, brief, testCommand, branch, by } = body ?? {};
      if (!root || !taskId) return Response.json({ error: 'root, taskId required' }, { status: 400 });
      if (!isHumanApprover(by)) return Response.json({ error: 'task must be created by the human' }, { status: 403 });
      try {
        const state = await createDepartmentTask(root, taskId, { title, brief, testCommand, branch, force: true });
        const sessionId = await startManager(ctx, root, taskId, title || taskId, promptFor(state, root, taskId));
        return Response.json({ ok: true, taskId: state.taskId, stage: state.stage, sessionId });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });


  add({
    path: DEPARTMENT_ROUTES.editor,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async () => {
      const html = await readFile(join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'editor.html'), 'utf8');
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.editorSave,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, name, rows, palette } = body ?? {};
      if (!root || !taskId || !Array.isArray(rows) || !palette) return Response.json({ error: 'root, taskId, rows, palette required' }, { status: 400 });
      const safe = String(name ?? 'sprite').replace(/[^a-z0-9._-]/gi, '_').slice(0, 60) || 'sprite';
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      const height = rows.length;
      const width = rows[0]?.length ?? 0;
      const rgba = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const symbol = rows[y][x];
          if (!symbol || symbol === '.') continue;
          const hex = palette[symbol];
          if (!hex) continue;
          const value = parseInt(String(hex).replace('#', ''), 16);
          const i = (y * width + x) * 4;
          rgba[i] = (value >> 16) & 255;
          rgba[i + 1] = (value >> 8) & 255;
          rgba[i + 2] = value & 255;
          rgba[i + 3] = 255;
        }
      }
      const dir = join(root, 'assets', 'office', 'editor');
      await mkdir(dir, { recursive: true });
      const png = join(dir, `${safe}.png`);
      await writeFile(png, encodePng(width, height, rgba));
      await writeFile(join(dir, `${safe}.json`), JSON.stringify({ rows, palette }, null, 2) + '\n', 'utf8');
      return Response.json({ ok: true, path: `assets/office/editor/${safe}.png`, width, height });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.editorHandoff,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, name, note, by } = body ?? {};
      if (!root || !taskId || !isHumanApprover(by)) return Response.json({ error: 'root, taskId, human signature required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      const result = addCorrection(state, {
        doc: 'interface',
        subject: `Спрайт: ${name || 'sprite'}`,
        text: note || 'Дорисовать спрайт в assets/office/editor/' + (name || 'sprite') + '.png',
        by: String(by),
      });
      await writeState(root, result.state);
      return Response.json({ ok: true, correctionId: result.correction.id });
    },
  });




  add({
    path: DEPARTMENT_ROUTES.taskStart,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, by } = body ?? {};
      if (!root || !taskId || !isHumanApprover(by)) return Response.json({ error: 'root, taskId, human signature required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      const sessionId = await startManager(ctx, root, taskId, state.title ?? taskId, promptFor(state, root, taskId));
      return Response.json({ ok: true, sessionId });
    },
  });



  add({
    path: DEPARTMENT_ROUTES.toDesign,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, by, reason } = body ?? {};
      if (!root || !taskId || !isHumanApprover(by)) return Response.json({ error: 'root, taskId, human signature required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      const approved = new Set((state.approvals ?? []).map((item) => item.doc));
      if (approved.has('design')) return Response.json({ error: 'дизайн уже утверждён' }, { status: 400 });
      if (state.stage !== 'executing') return Response.json({ error: 'вернуть в дизайн можно только из executing' }, { status: 400 });
      try {
        const next = await writeState(root, advanceStage(state, 'design', reason ?? 'возврат в дизайн: не был утверждён'));
        await startManager(ctx, root, taskId, state.title ?? taskId, promptFor(next, root, taskId));
        return Response.json({ ok: true, stage: next.stage });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.reopen,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, by, reason } = body ?? {};
      if (!root || !taskId || !isHumanApprover(by)) return Response.json({ error: 'root, taskId, human signature required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      try {
        const next = await writeState(root, reopenTask(state, { by: String(by), reason: reason ?? '' }));
        await startManager(ctx, root, taskId, state.title ?? taskId, promptFor(next, root, taskId));
        return Response.json({ ok: true, stage: next.stage });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.taskDelete,
    methods: ['DELETE'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      const root = url.searchParams.get('root');
      const taskId = url.searchParams.get('taskId');
      const by = url.searchParams.get('by');
      if (!root || !taskId || !isHumanApprover(by)) return Response.json({ error: 'root, taskId, human signature required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      const dir = join(root, 'docs', 'department', taskId);
      const trash = join(root, 'docs', 'department', '.trash');
      await mkdir(trash, { recursive: true });
      const target = join(trash, `${taskId}-${Date.now()}`);
      await rename(dir, target);
      return Response.json({ ok: true, movedTo: target });
    },
  });


  add({
    path: DEPARTMENT_ROUTES.design,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      const root = url.searchParams.get('root');
      const taskId = url.searchParams.get('taskId');
      if (!root || !taskId) return Response.json({ error: 'root, taskId required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      let design = '';
      try { design = await readFile(join(root, 'docs', 'department', taskId, 'design.md'), 'utf8'); } catch { design = ''; }
      let references = [];
      try {
        const entries = await readdir(join(root, 'docs', 'department', taskId, 'references'), { withFileTypes: true });
        references = entries.filter((entry) => entry.isFile() && /\.(png|jpe?g|webp|gif)$/i.test(entry.name)).map((entry) => entry.name).sort();
      } catch { references = []; }
      return Response.json({ design, references, feedback: state.designFeedback ?? [] });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.designImage,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      const root = url.searchParams.get('root');
      const taskId = url.searchParams.get('taskId');
      const name = String(url.searchParams.get('name') ?? '');
      if (!root || !taskId || !/^[a-z0-9._-]+$/i.test(name)) return new Response('bad request', { status: 400 });
      try {
        const bytes = await readFile(join(root, 'docs', 'department', taskId, 'references', name));
        return new Response(bytes, { headers: { 'content-type': name.endsWith('.jpg') || name.endsWith('.jpeg') ? 'image/jpeg' : name.endsWith('.webp') ? 'image/webp' : 'image/png', 'cache-control': 'public, max-age=3600' } });
      } catch {
        return new Response('not found', { status: 404 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.designFeedback,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, path, verdict, note, by } = body ?? {};
      if (!root || !taskId || !path || !isHumanApprover(by)) return Response.json({ error: 'root, taskId, path, human signature required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      const next = await writeState(root, addDesignFeedback(state, { path: String(path), verdict: verdict === 'like' ? 'like' : 'dislike', note, by: String(by) }));
      return Response.json({ ok: true, feedback: next.designFeedback ?? [] });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.browseDirs,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      try {
        const listing = await listDirectories(url.searchParams.get('path'));
        const projects = [];
        for (const name of listing.dirs) {
          const full = join(listing.path, name);
          if (await isGitProject(full)) projects.push(name);
        }
        return Response.json({ ...listing, projects });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.pause,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, paused, reason, by } = body ?? {};
      if (!root || !taskId || typeof paused !== 'boolean' || !by) return Response.json({ error: 'root, taskId, paused, by required' }, { status: 400 });
      if (!isHumanApprover(by)) return Response.json({ error: 'pause must be signed by the human' }, { status: 403 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      const next = await writeState(root, setPaused(state, { paused, reason: reason ?? '', by }));
      if (!paused) {
        try {
          const registry = ctx.get('agents');
          for (const agent of registry.list()) {
            if (agent?.session?.header?.cwd !== root || typeof agent.followup !== 'function') continue;
            agent.followup({ role: 'user', content: [{ type: 'text', text: 'Пауза снята. Продолжай: dept_health, dept_status, следующий шаг по плану.' }], source: { kind: 'dsh-department' } });
          }
        } catch {
          // сервис агентов недоступен
        }
      }
      return Response.json({ paused: Boolean(next.paused?.value) });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.correction,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { root, taskId, doc, subject, text, by, priority } = body ?? {};
        if (!root || !taskId || !doc || !text || !by) return Response.json({ error: 'root, taskId, doc, text, by required' }, { status: 400 });
        if (!isHumanApprover(by)) return Response.json({ error: 'correction must be created by the human' }, { status: 403 });
        const state = await readState(root, taskId);
        if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
        const result = addCorrection(state, { doc, subject: subject ?? '', text, by, priority });
        await writeState(root, result.state);
        const notice = `Новая корректировка ${result.correction.id} (${doc}): ${subject || ''}\n${String(text).slice(0, 800)}\n` +
          'Возьми её в работу (dept_correction status=in_progress), оцени влияние на design.md/spec.md/plan.md, ' +
          'обнови документы. Без утверждённого дизайна код не начинай. Закрой корректировку done с итогом.';
        await startManager(ctx, root, taskId, state.title ?? taskId, notice);
        return Response.json({ correction: result.correction });
      }
      const root = url.searchParams.get('root');
      const taskId = url.searchParams.get('taskId');
      if (!root || !taskId) return Response.json({ error: 'root, taskId required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      return Response.json({ corrections: state.corrections ?? [] });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.review,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, questionId, verdict, remarks, by } = body ?? {};
      if (!root || !taskId || !questionId || !verdict || !by) return Response.json({ error: 'root, taskId, questionId, verdict, by required' }, { status: 400 });
      if (!isHumanApprover(by)) return Response.json({ error: 'review must be signed by the human' }, { status: 403 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      try {
        const next = await writeState(root, reviewMemo(state, { questionId, verdict, remarks: remarks ?? '', by }));
        return Response.json({ questions: next.questions });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.projects,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const roots = resolveRoots(ctx, new URL(request.url).searchParams.get('root'));
      const projects = await listProjects(roots);
      return Response.json({ projects });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.roles,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { root, taskId, role, model, reasoning, enabled, maxInstances } = body ?? {};
        if (!root || !taskId || !role) return Response.json({ error: 'root, taskId, role required' }, { status: 400 });
        const state = await readState(root, taskId);
        if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
        try {
          const next = await writeState(root, setRole(state, { role, model, reasoning, enabled, maxInstances }));
          return Response.json({ roles: listRoles(next) });
        } catch (error) {
          return Response.json({ error: error.message }, { status: 400 });
        }
      }
      const root = url.searchParams.get('root');
      const taskId = url.searchParams.get('taskId');
      if (!root || !taskId) return Response.json({ error: 'root, taskId required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      return Response.json({ roles: listRoles(state) });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.blueprint,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const root = new URL(request.url).searchParams.get('root');
      if (!root) return Response.json({ error: 'root required' }, { status: 400 });
      try {
        const blueprint = await buildBlueprint(root);
        return Response.json({ blueprint });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.approve,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, doc, by } = body ?? {};
      if (!root || !taskId || !doc || !by) return Response.json({ error: 'root, taskId, doc, by required' }, { status: 400 });
      if (!isHumanApprover(by)) return Response.json({ error: 'approval must be signed by the human' }, { status: 403 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      try {
        await assertApprovalReady(root, taskId, doc, state);
        const next = await writeState(root, approveDocument(state, { doc, by }));
        await startManager(ctx, root, taskId, state.title ?? taskId, promptFor(next, root, taskId));
        return Response.json({ stage: next.stage, summary: next.approvals });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.answer,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, questionId, answer, by } = body ?? {};
      if (!root || !taskId || !questionId || !answer || !by) return Response.json({ error: 'root, taskId, questionId, answer, by required' }, { status: 400 });
      if (!isHumanApprover(by)) return Response.json({ error: 'answer must be signed by the human' }, { status: 403 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      try {
        const next = await writeState(root, answerQuestion(state, { id: questionId, answer, by }));
        return Response.json({ questions: next.questions.length });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.amend,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await request.json().catch(() => ({}));
      const { root, taskId, doc, summary, reason, by } = body ?? {};
      if (!root || !taskId || !doc || !summary || !by) return Response.json({ error: 'root, taskId, doc, summary, by required' }, { status: 400 });
      if (!isHumanApprover(by)) return Response.json({ error: 'amendment must be signed by the human' }, { status: 403 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      try {
        const next = await writeState(root, amendDocument(state, { doc, summary, reason: reason ?? '', by }));
        return Response.json({ amendments: next.amendments.length });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.budget,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { root, taskId, limitTokens, prices, rateRUB, by } = body ?? {};
        if (!root || !taskId) return Response.json({ error: 'root, taskId required' }, { status: 400 });
        const state = await readState(root, taskId);
        if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
        const human = Boolean(by) && isHumanApprover(String(by));
        const next = await writeState(root, setBudget(state, {
          limitTokens,
          prices,
          rateRUB,
          human,
          by: human ? String(by) : 'manager',
          reason: human ? 'человек: изменение бюджета' : '',
        }));
        return Response.json({ budget: next.gates.budget });
      }
      const root = url.searchParams.get('root');
      const taskId = url.searchParams.get('taskId');
      if (!root || !taskId) return Response.json({ error: 'root, taskId required' }, { status: 400 });
      const state = await readState(root, taskId);
      if (!state) return Response.json({ error: 'task not found' }, { status: 404 });
      const agents = activity ? activity.list([root]) : [];
      const usage = agents.reduce((sum, agent) => ({
        inputTokens: sum.inputTokens + (agent.usage?.inputTokens ?? 0),
        outputTokens: sum.outputTokens + (agent.usage?.outputTokens ?? 0),
        cacheReadTokens: sum.cacheReadTokens + (agent.usage?.cacheReadTokens ?? 0),
        cacheWriteTokens: sum.cacheWriteTokens + (agent.usage?.cacheWriteTokens ?? 0),
        calls: sum.calls + (agent.usage?.calls ?? 0),
      }), { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, calls: 0 });
      const budget = state.gates?.budget ?? {};
      const prices = budget.prices ?? { inputTokens: 0.27, outputTokens: 1.1, cacheReadTokens: 0.07, cacheWriteTokens: 0.27 };
      const costUSD = (usage.inputTokens / 1e6) * prices.inputTokens + (usage.outputTokens / 1e6) * prices.outputTokens + (usage.cacheReadTokens / 1e6) * prices.cacheReadTokens + (usage.cacheWriteTokens / 1e6) * prices.cacheWriteTokens;
      return Response.json({ budget: { ...budget, usage, costUSD, rateRUB: budget.rateRUB ?? 90 } });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.asset,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      const name = String(url.searchParams.get('name') ?? '');
      if (!/^[a-z0-9._-]+$/i.test(name)) return new Response('bad asset name', { status: 400 });
      try {
        const bytes = await readFile(join(assetsDir, name));
        return new Response(bytes, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' } });
      } catch {
        return new Response('not found', { status: 404 });
      }
    },
  });

  add({
    path: DEPARTMENT_ROUTES.activity,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      const roots = resolveRoots(ctx, url.searchParams.get('root'));
      const active = await rootsWithTasks(roots);
      const scope = active.length > 0 ? active : roots;
      return Response.json({ roots: scope, activity: activity ? activity.list(scope) : [] });
    },
  });

  add({
    path: DEPARTMENT_ROUTES.task,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const url = new URL(request.url);
      const root = url.searchParams.get('root');
      const taskId = url.searchParams.get('taskId');
      if (!root || !taskId) {
        return Response.json({ error: 'root and taskId are required' }, { status: 400 });
      }
      const payload = await taskPayload(root, taskId);
      if (!payload) return Response.json({ error: 'task not found' }, { status: 404 });
      return Response.json(payload);
    },
  });

  return {
    registered,
    dispose() {
      for (const dispose of disposers) if (typeof dispose === 'function') dispose();
    },
  };
}
