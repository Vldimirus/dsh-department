/**
 * Браузерная половина плагина «ИИ-отдел»: доска задач и карточка задачи.
 * Классический скрипт: без import/export, React берётся из таблицы модулей.
 */
window.__ModuleLoader__.load({
  id: 'dsh-department',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState } = React

    const PANEL_ID = 'department'
    const ROUTES = {
      tasks: '/api/department/tasks',
      task: '/api/department/task',
    }

    function styleOnce() {
      if (document.getElementById('department-styles')) return
      const style = document.createElement('style')
      style.id = 'department-styles'
      style.textContent = `
        .dept-root { display: flex; flex-direction: column; gap: 12px; padding: 16px; height: 100%; overflow: auto; color: var(--dsw-alias-label-primary, #e6edf7); font-size: 13px; }
        .dept-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .dept-title { font-size: 15px; font-weight: 600; letter-spacing: .01em; }
        .dept-sub { color: var(--dsw-alias-label-tertiary, #8b98ad); font-size: 12px; }
        .dept-btn { border: 1px solid var(--dsw-alias-border-secondary, #2a3446); background: var(--dsw-alias-bg-secondary, #121826); color: inherit; border-radius: 8px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
        .dept-btn:hover { border-color: var(--dsw-alias-border-primary, #3d4a63); }
        .dept-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
        .dept-card { border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 12px; padding: 12px; background: var(--dsw-alias-bg-secondary, #10151f); cursor: pointer; display: flex; flex-direction: column; gap: 8px; }
        .dept-card:hover { border-color: var(--dsw-alias-border-primary, #3d4a63); }
        .dept-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .dept-badge { border-radius: 999px; padding: 2px 8px; font-size: 11px; border: 1px solid var(--dsw-alias-border-secondary, #2a3446); }
        .dept-badge.ok { color: #7fdc9a; border-color: #2c5a3d; }
        .dept-badge.fail { color: #ff9a9a; border-color: #6a2c2c; }
        .dept-badge.wait { color: #d8c07a; border-color: #5a4a22; }
        .dept-bar { height: 6px; border-radius: 999px; background: var(--dsw-alias-bg-tertiary, #1b2333); overflow: hidden; }
        .dept-bar > i { display: block; height: 100%; background: linear-gradient(90deg, #4b8bff, #7fd4ff); }
        .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
        .dept-doc { border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 8px; padding: 6px 8px; font-size: 12px; }
        .dept-doc.missing { opacity: .5; border-style: dashed; }
        .dept-events { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
        .dept-event { display: flex; gap: 8px; }
        .dept-event time { color: var(--dsw-alias-label-tertiary, #8b98ad); min-width: 92px; }
        .dept-pre { white-space: pre-wrap; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--dsw-alias-label-secondary, #b8c4d6); }
        .dept-empty { padding: 24px; text-align: center; color: var(--dsw-alias-label-tertiary, #8b98ad); }
      `
      document.head.append(style)
    }

    async function api(path) {
      const response = await fetch(path, { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return response.json()
    }

    function badge(status) {
      const cls = status === 'pass' ? 'ok' : status === 'fail' ? 'fail' : 'wait'
      return h('span', { className: `dept-badge ${cls}` }, status)
    }

    function formatElapsed(ms) {
      const total = Math.max(0, Math.floor(ms / 1000))
      const minutes = Math.floor(total / 60)
      const seconds = total % 60
      return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}с`
    }

    function ActivityBlock() {
      const [items, setItems] = useState([])
      const [error, setError] = useState(null)

      async function load() {
        try {
          const payload = await api('/api/department/activity')
          setItems(payload.activity ?? [])
          setError(null)
        } catch (problem) {
          setError(problem.message)
        }
      }

      useEffect(() => {
        load()
        const timer = setInterval(load, 3000)
        return () => clearInterval(timer)
      }, [])

      return h(
        'div',
        null,
        h('div', { className: 'dept-title' }, 'Сейчас работают'),
        error ? h('div', { className: 'dept-sub' }, error) : null,
        items.length === 0
          ? h('div', { className: 'dept-sub' }, 'активности нет')
          : h('div', { className: 'dept-events' }, ...items.map((entry) =>
              h('div', { key: entry.sessionId, className: 'dept-event' },
                h('span', { className: entry.busy ? 'dept-badge ok' : 'dept-badge wait' }, entry.busy ? '●' : '○'),
                h('span', null, `${entry.kind}: ${entry.lastAction}${entry.tool ? ' · ' + entry.tool : ''}`),
                h('span', { className: 'dept-sub' }, formatElapsed(entry.elapsedMs)),
              ))),
      )
    }

    function TaskCard({ task, onOpen }) {
      return h(
        'div',
        { className: 'dept-card', onClick: () => onOpen(task) },
        h('div', { className: 'dept-row' }, h('strong', null, task.title), h('span', { className: 'dept-sub' }, task.taskId)),
        h('div', { className: 'dept-row' }, h('span', { className: 'dept-badge' }, task.stage), h('span', { className: 'dept-sub' }, `ветка ${task.branch}`)),
        h('div', { className: 'dept-bar' }, h('i', { style: { width: `${task.progress}%` } })),
        h('div', { className: 'dept-row' }, h('span', { className: 'dept-sub' }, `${task.progress}%`), badge(`tests:${task.tests}`), badge(`review:${task.review}`)),
        task.lastEvent ? h('div', { className: 'dept-sub' }, `${task.lastEvent.action} · ${task.lastEvent.detail ?? ''}`) : null,
      )
    }

    function TaskDetail({ detail, onBack }) {
      const docs = ['task.md', 'analysis.md', 'concept.md', 'spec.md', 'plan.md', 'backlog.md']
      return h(
        'div',
        { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, detail.title),
            h('div', { className: 'dept-sub' }, `${detail.stage} · ${detail.progress}% · ветка ${detail.currentBranch ?? detail.branch}`),
          ),
          h('button', { className: 'dept-btn', onClick: onBack }, '← К доске'),
        ),
        h('div', { className: 'dept-bar' }, h('i', { style: { width: `${detail.progress}%` } })),
        h('div', { className: 'dept-row' }, badge(`tests:${detail.tests}`), badge(`review:${detail.review}`),
          h('span', { className: 'dept-sub' }, `попытки ${detail.attempts} · бюджет ${detail.budget.usedTokens}/${detail.budget.limitTokens}`)),
        h('div', { className: 'dept-title' }, 'Документы'),
        h('div', { className: 'dept-grid' }, ...docs.map((name) =>
          h('div', { key: name, className: `dept-doc ${detail.files?.[name] ? '' : 'missing'}` }, `${name}${detail.files?.[name] ? '' : ' — нет'}`))),
        h('div', { className: 'dept-title' }, 'Аудит'),
        h('div', { className: 'dept-events' }, ...(detail.audit?.checks ?? []).map((check) =>
          h('div', { key: check.id, className: 'dept-event' },
            h('span', { className: check.ok ? 'dept-badge ok' : 'dept-badge fail' }, check.ok ? 'OK' : 'FAIL'),
            h('span', null, `${check.id}: ${check.detail}`)))),
        h('div', { className: 'dept-title' }, 'События'),
        h('div', { className: 'dept-events' }, ...(detail.events ?? []).map((event) =>
          h('div', { key: event.id, className: 'dept-event' },
            h('time', null, String(event.ts).replace('T', ' ').slice(0, 19)),
            h('span', null, `${event.actor}: ${event.action} ${event.detail ? '— ' + event.detail : ''}`)))),
        h('div', { className: 'dept-title' }, 'Git'),
        h('div', { className: 'dept-pre' }, (detail.recentCommits ?? []).join('\n') || 'нет коммитов'),
        h('div', { className: 'dept-sub' }, `теги: ${(detail.tags ?? []).join(', ') || '—'}`),
      )
    }

    function DepartmentPanel() {
      styleOnce()
      const [tasks, setTasks] = useState([])
      const [selected, setSelected] = useState(null)
      const [detail, setDetail] = useState(null)
      const [error, setError] = useState(null)
      const [loading, setLoading] = useState(true)

      async function loadTasks() {
        setLoading(true)
        setError(null)
        try {
          const payload = await api(ROUTES.tasks)
          setTasks(payload.tasks ?? [])
        } catch (problem) {
          setError(problem.message)
        } finally {
          setLoading(false)
        }
      }

      async function openTask(task) {
        setSelected(task)
        setDetail(null)
        try {
          const payload = await api(`${ROUTES.task}?root=${encodeURIComponent(task.root)}&taskId=${encodeURIComponent(task.taskId)}`)
          setDetail(payload)
        } catch (problem) {
          setError(problem.message)
        }
      }

      useEffect(() => { loadTasks() }, [])

      if (selected) {
        return detail
          ? h(TaskDetail, { detail, onBack: () => { setSelected(null); setDetail(null) } })
          : h('div', { className: 'dept-root' }, h('div', { className: 'dept-empty' }, 'Загрузка задачи…'))
      }

      return h(
        'div',
        { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, 'ИИ-отдел разработки'),
            h('div', { className: 'dept-sub' }, `задач: ${tasks.length}${loading ? ' · обновление…' : ''}`),
          ),
          h('button', { className: 'dept-btn', onClick: loadTasks }, 'Обновить'),
        ),
        h(ActivityBlock, null),
        error ? h('div', { className: 'dept-badge fail' }, error) : null,
        tasks.length === 0 && !loading
          ? h('div', { className: 'dept-empty' }, 'Задач пока нет. Создай задачу через dept_start.')
          : h('div', { className: 'dept-list' }, ...tasks.map((task) => h(TaskCard, { key: `${task.root}:${task.taskId}`, task, onOpen: openTask }))),
      )
    }

    function DepartmentIcon(props) {
      const size = props?.size ?? 16
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M4 20V8l5-3 5 3v12', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' }),
        h('path', { d: 'M14 20V11l5-2v11', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' }),
        h('path', { d: 'M3 20h18', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('circle', { cx: 9, cy: 12, r: 1.3, fill: 'currentColor' }))
    }

    const inject = ['slots']

    function apply(ctx) {
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
        { name: 'sidebar.panellist', id: PANEL_ID, order: 55, label: 'ИИ-отдел' },
        DepartmentIcon,
      ))
      ctx.slots.inject('main', () => ctx.slots.register(
        { name: 'main', key: PANEL_ID },
        DepartmentPanel,
      ))
    }

    return { PANEL_ID, apply, inject }
  },
})
