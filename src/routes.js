/**
 * HTTP-маршруты Web-панели отдела на общем канале `/api`.
 * Только чтение: доска и карточка задачи.
 */
import { listTasks, resolveRoots, rootsWithTasks, taskPayload } from './panel-api.js';

/** Точные маршруты панели. */
export const DEPARTMENT_ROUTES = {
  tasks: '/api/department/tasks',
  task: '/api/department/task',
  activity: '/api/department/activity',
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
