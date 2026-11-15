/**
 * HTTP-маршруты Web-панели отдела на общем канале `/api`.
 * Только чтение: доска и карточка задачи.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listTasks, resolveRoots, rootsWithTasks, taskPayload } from './panel-api.js';

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

/** Точные маршруты панели. */
export const DEPARTMENT_ROUTES = {
  tasks: '/api/department/tasks',
  task: '/api/department/task',
  activity: '/api/department/activity',
  asset: '/api/department/asset',
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
