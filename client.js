/**
 * Браузерная половина плагина «ИИ-отдел»: доска задач, карточка задачи и офис.
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
      activity: '/api/department/activity',
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
        .dept-btn.active { border-color: #4b8bff; color: #cfe3ff; }
        .dept-tabs { display: flex; gap: 6px; }
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
        .dept-event { display: flex; gap: 8px; flex-wrap: wrap; }
        .dept-event time { color: var(--dsw-alias-label-tertiary, #8b98ad); min-width: 92px; }
        .dept-pre { white-space: pre-wrap; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--dsw-alias-label-secondary, #b8c4d6); }
        .dept-empty { padding: 24px; text-align: center; color: var(--dsw-alias-label-tertiary, #8b98ad); }
        .dept-office { border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 16px; background: radial-gradient(circle at 50% 0%, #121a2b 0%, #0a0f18 70%); padding: 8px; }
        .dept-office svg { width: 100%; height: auto; display: block; }
        .dept-avatar { cursor: pointer; transition: transform .9s cubic-bezier(.2,.8,.2,1); }
        .dept-avatar.busy .dept-pulse { animation: dept-pulse 1.4s ease-in-out infinite; }
        @keyframes dept-pulse { 0%,100% { opacity: .25; r: 18; } 50% { opacity: .8; r: 24; } }
        .dept-office-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--dsw-alias-label-tertiary, #8b98ad); padding: 6px 4px 0; }
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

    function useActivity() {
      const [items, setItems] = useState([])
      const [error, setError] = useState(null)
      useEffect(() => {
        let alive = true
        async function load() {
          try {
            const payload = await api(ROUTES.activity)
            if (!alive) return
            setItems(payload.activity ?? [])
            setError(null)
          } catch (problem) {
            if (alive) setError(problem.message)
          }
        }
        load()
        const timer = setInterval(load, 3000)
        return () => { alive = false; clearInterval(timer) }
      }, [])
      return { items, error }
    }

    function ActivityBlock({ items, error }) {
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

    /* ---------------- Офис ---------------- */

    const DESKS = [
      { key: 'manager', x: 320, y: 118, label: 'Руководитель' },
      { key: 'coder', x: 132, y: 214, label: 'Кодер' },
      { key: 'reviewer', x: 508, y: 214, label: 'Ревьюер' },
      { key: 'tester', x: 320, y: 268, label: 'Тестер' },
      { key: 'analyst', x: 196, y: 282, label: 'Аналитик' },
      { key: 'archivist', x: 444, y: 282, label: 'Архивариус' },
    ]

    function inferRole(entry) {
      if (entry.kind === 'менеджер') return 'manager'
      const tool = String(entry.tool || '')
      const args = String(entry.args || '').toLowerCase()
      if (tool === 'write' || tool === 'edit') return 'coder'
      if (tool === 'bash' && /test|check|node --test/.test(args)) return 'tester'
      if (tool === 'read' || tool === 'grep' || tool === 'glob') return 'reviewer'
      if (tool === 'dept_commit') return 'archivist'
      if (tool === 'dept_start' || tool === 'dept_stage' || tool === 'dept_amend') return 'manager'
      return 'coder'
    }

    function OfficeView({ items, selected, onSelect }) {
      const taken = new Map()
      const avatars = items.map((entry) => {
        let role = inferRole(entry)
        if (taken.has(role) && role !== 'manager') {
          const free = DESKS.find((desk) => !taken.has(desk.key) && desk.key !== 'manager')
          if (free) role = free.key
        }
        taken.set(role, entry)
        const desk = DESKS.find((candidate) => candidate.key === role) ?? DESKS[1]
        return { entry, role, desk }
      })

      return h(
        'div',
        { className: 'dept-root' },
        h('div', { className: 'dept-row' },
          h('div', { className: 'dept-title' }, 'Офис отдела'),
          h('div', { className: 'dept-sub' }, items.length ? `сотрудников: ${items.length}` : 'никого нет')),
        h('div', { className: 'dept-office' },
          h('svg', { viewBox: '0 0 640 340', role: 'img', 'aria-label': 'Офис ИИ-отдела' },
            h('rect', { x: 20, y: 40, width: 600, height: 280, rx: 18, fill: '#0c1320', stroke: '#1c2740' }),
            h('rect', { x: 20, y: 40, width: 600, height: 24, rx: 12, fill: '#101a2b' }),
            h('text', { x: 36, y: 57, fill: '#5f7392', fontSize: 11 }, 'AI DEPARTMENT · FLOOR 1'),
            ...DESKS.map((desk) =>
              h('g', { key: `desk-${desk.key}` },
                h('rect', { x: desk.x - 46, y: desk.y - 6, width: 92, height: 18, rx: 6, fill: '#141d2e', stroke: '#22304a' }),
                h('text', { x: desk.x, y: desk.y + 6, fill: '#41577a', fontSize: 9, textAnchor: 'middle' }, desk.label))),
            ...avatars.map(({ entry, role, desk }) => {
              const busy = Boolean(entry.busy)
              const isSelected = selected === entry.sessionId
              return h('g', {
                key: entry.sessionId,
                className: `dept-avatar ${busy ? 'busy' : ''}`,
                transform: `translate(${desk.x}, ${desk.y - 52})`,
                onClick: () => onSelect(entry.sessionId),
                style: isSelected ? { filter: 'drop-shadow(0 0 6px #4b8bff)' } : undefined,
              },
                h('circle', { className: 'dept-pulse', cx: 0, cy: 10, r: 18, fill: busy ? '#2d6cff33' : '#2a344a22' }),
                h('circle', { cx: 0, cy: 2, r: 7, fill: busy ? '#8fc2ff' : '#6c7a92' }),
                h('rect', { x: -8, y: 10, width: 16, height: 20, rx: 6, fill: busy ? '#3d7bff' : '#3a4560' }),
                h('text', { x: 0, y: 44, fill: '#7f93b3', fontSize: 9, textAnchor: 'middle' },
                  entry.kind === 'менеджер' ? 'руководитель' : (DESKS.find((d) => d.key === role)?.label ?? 'агент')),
              )
            }),
          ),
          h('div', { className: 'dept-office-legend' },
            h('span', null, '● занят'), h('span', null, '○ простаивает'), h('span', null, 'клик по человечку — что делает')),
        ),
        selected ? h('div', { className: 'dept-events' }, (items.find((entry) => entry.sessionId === selected)?.recent ?? []).map((event, index) =>
          h('div', { key: index, className: 'dept-event' },
            h('time', null, String(new Date(event.ts).toLocaleTimeString('ru-RU'))),
            h('span', null, event.text)))) : null,
      )
    }

    /* ---------------- Доска ---------------- */

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

    /* ---------------- Панель ---------------- */

    function DepartmentPanel() {
      styleOnce()
      const [view, setView] = useState('board')
      const [tasks, setTasks] = useState([])
      const [selected, setSelected] = useState(null)
      const [detail, setDetail] = useState(null)
      const [error, setError] = useState(null)
      const [loading, setLoading] = useState(true)
      const [selectedSession, setSelectedSession] = useState(null)
      const activity = useActivity()

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
        setView('board')
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

      if (view === 'office') {
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', { className: 'dept-tabs' },
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, 'Доска'),
              h('button', { className: 'dept-btn active', onClick: () => setView('office') }, 'Офис')),
            h('button', { className: 'dept-btn', onClick: loadTasks }, 'Обновить')),
          h(OfficeView, { items: activity.items, selected: selectedSession, onSelect: setSelectedSession }),
        )
      }

      return h(
        'div',
        { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, 'ИИ-отдел разработки'),
            h('div', { className: 'dept-sub' }, `задач: ${tasks.length}${loading ? ' · обновление…' : ''}`),
          ),
          h('div', { className: 'dept-tabs' },
            h('button', { className: 'dept-btn active', onClick: () => setView('board') }, 'Доска'),
            h('button', { className: 'dept-btn', onClick: () => setView('office') }, 'Офис'),
            h('button', { className: 'dept-btn', onClick: loadTasks }, 'Обновить')),
        ),
        h(ActivityBlock, { items: activity.items, error: activity.error }),
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
