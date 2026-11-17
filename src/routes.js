/**
 * HTTP-маршруты Web-панели отдела на общем канале `/api`.
 * Только чтение: доска и карточка задачи.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listProjects, listTasks, resolveRoots, rootsWithTasks, taskPayload } from './panel-api.js';
import { addCorrection, amendDocument, answerQuestion, approveDocument, listRoles, readState, reviewMemo, setBudget, setPaused, setRole, writeState } from './store.js';
import { isHumanApprover } from './roles.js';
import { buildBlueprint } from './blueprint.js';
import { listDocuments, readDocument } from './documents.js';

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

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
        const next = await writeState(root, approveDocument(state, { doc, by }));
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
