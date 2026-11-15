/**
 * Живая активность агентов отдела: кто, что и сколько делает.
 *
 * Плагин слушает `session/event` и `agent/status` и держит в памяти последние
 * действия по каждой сессии. Это же поток данных позже будет двигать спрайтов
 * в «офисе» — поэтому формат здесь максимально простой и стабильный.
 */

/** Сколько сессий без обновлений держим в памяти. */
const STALE_MS = 2 * 60 * 60 * 1000;

/** Сколько последних действий хранить на сессию. */
const RECENT_LIMIT = 20;

/**
 * Создаёт трекер активности.
 *
 * @param {object} ctx Контекст плагина.
 * @returns {{ list: (roots: string[]) => object[], dispose: () => void }}
 */
export function createActivityTracker(ctx) {
  const sessions = new Map();
  const disposers = [];

  const entryFor = (session) => {
    const id = session?.id ?? 'unknown';
    let entry = sessions.get(id);
    if (!entry) {
      const header = session?.header ?? {};
      entry = {
        sessionId: id,
        cwd: header.cwd ?? null,
        depth: header.delegationDepth ?? 0,
        kind: header.origin === 'subagent' ? 'субагент' : 'менеджер',
        busy: false,
        lastAction: 'ожидание',
        tool: null,
        args: null,
        since: Date.now(),
        updatedAt: Date.now(),
        recent: [],
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, calls: 0 },
      };
      sessions.set(id, entry);
    }
    return entry;
  };

  const push = (entry, text, time) => {
    entry.recent.push({ ts: time, text });
    if (entry.recent.length > RECENT_LIMIT) entry.recent.splice(0, entry.recent.length - RECENT_LIMIT);
  };

  const onSessionEvent = (session, event) => {
    const entry = entryFor(session);
    const time = Number(event?.time) || Date.now();
    const data = event?.data ?? {};
    entry.updatedAt = Date.now();
    switch (event?.type) {
      case 'turn/start':
        entry.busy = true;
        entry.lastAction = 'начал ход';
        entry.since = time;
        break;
      case 'step/start':
        entry.busy = true;
        entry.lastAction = 'думает (шаг модели)';
        entry.since = time;
        break;
      case 'step/end':
        entry.lastAction = 'шаг завершён';
        break;
      case 'tool/call':
        entry.busy = true;
        entry.lastAction = `вызывает ${data.name ?? 'инструмент'}`;
        entry.tool = data.name ?? null;
        entry.args = String(data.arguments ?? '').slice(0, 160);
        entry.since = time;
        push(entry, `${data.name ?? 'tool'}${entry.args ? ' ' + entry.args : ''}`, time);
        break;
      case 'tool/result':
        entry.lastAction = 'получил результат';
        push(entry, 'результат инструмента', time);
        break;
      case 'assistant/message':
        entry.lastAction = 'ответил';
        entry.busy = false;
        if (data.usage) {
          entry.usage.inputTokens += Number(data.usage.inputTokens ?? 0);
          entry.usage.outputTokens += Number(data.usage.outputTokens ?? 0);
          entry.usage.cacheReadTokens += Number(data.usage.cacheReadTokens ?? 0);
          entry.usage.cacheWriteTokens += Number(data.usage.cacheWriteTokens ?? 0);
          entry.usage.calls += 1;
        }
        push(entry, 'ответ ассистента', time);
        break;
      case 'error':
      case 'turn/error':
        entry.lastAction = 'ошибка';
        push(entry, `ошибка: ${data.message ?? ''}`.trim(), time);
        break;
      default:
        break;
    }
  };

  const onAgentStatus = (payload) => {
    const session = payload?.agent?.session;
    if (!session) return;
    const entry = entryFor(session);
    const status = String(payload?.status ?? '');
    entry.busy = status !== 'idle' && status !== 'stopped';
    if (!entry.busy && entry.lastAction === 'ожидание') entry.lastAction = 'простаивает';
    entry.updatedAt = Date.now();
  };

  try {
    const dispose = ctx.on('session/event', onSessionEvent);
    if (typeof dispose === 'function') disposers.push(dispose);
  } catch {
    // без шины событий трекер просто пустой
  }
  try {
    const dispose = ctx.on('agent/status', onAgentStatus);
    if (typeof dispose === 'function') disposers.push(dispose);
  } catch {
    // необязательное событие
  }

  return {
    /**
     * Список активности по корням проектов.
     *
     * @param {string[]} roots Корни.
     * @returns {object[]}
     */
    list(roots) {
      // Сессии, которые ещё не прислали событий после загрузки плагина, всё
      // равно должны быть видны как «простаивают».
      try {
        const agents = typeof ctx?.get === 'function' ? ctx.get('agents') : null;
        if (agents && typeof agents.list === 'function') {
          for (const agent of agents.list()) {
            if (!agent?.session) continue;
            const entry = entryFor(agent.session);
            if (entry.lastAction === 'ожидание') entry.lastAction = 'простаивает';
          }
        }
      } catch {
        // сервис агентов необязателен
      }
      const cutoff = Date.now() - STALE_MS;
      for (const [id, entry] of sessions) {
        if (entry.updatedAt < cutoff) sessions.delete(id);
      }
      const items = [...sessions.values()]
        .filter((entry) => !roots || roots.length === 0 || (entry.cwd && roots.some((root) => entry.cwd === root || entry.cwd.startsWith(`${root}/`))))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      return items.map((entry) => ({
        ...entry,
        elapsedMs: Math.max(0, Date.now() - entry.since),
        recent: entry.recent.slice(-8).reverse(),
      }));
    },
    dispose() {
      for (const dispose of disposers) if (typeof dispose === 'function') dispose();
      sessions.clear();
    },
  };
}
