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
        .dept-office-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 12px; align-items: start; }
        .dept-office { min-width: 0; }
        .dept-office-side { width: 340px; border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 12px; padding: 10px; background: var(--dsw-alias-bg-secondary, #10151f); display: flex; flex-direction: column; gap: 6px; }
        .dept-office-side .dept-pre { max-height: 220px; overflow: auto; }
        .dept-office { border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 16px; background: radial-gradient(circle at 50% 0%, #121a2b 0%, #0a0f18 70%); padding: 8px; }
        .dept-office svg { width: 100%; height: auto; display: block; }
        .dept-typing rect { animation: dept-type .3s steps(2) infinite; }
        .dept-typing rect:last-child { animation-delay: .15s; }
        .dept-keyboard { animation: dept-key .4s steps(2) infinite; }
        .dept-steam { animation: dept-steam 1.6s ease-in-out infinite; }
        .dept-steam.s2 { animation-delay: .5s; }
        .dept-reading { animation: dept-read 2.2s ease-in-out infinite; transform-origin: center; }
        @keyframes dept-type { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
        @keyframes dept-key { 0%, 100% { fill: #1a2436; } 50% { fill: #6fb2ff; } }
        @keyframes dept-steam { 0% { opacity: 0; transform: translateY(0); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
        @keyframes dept-read { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        .dept-avatar { cursor: pointer; transition: transform .9s cubic-bezier(.2,.8,.2,1); }
        .dept-avatar .dept-body { animation: dept-bob 2.6s ease-in-out infinite; transform-origin: center; }
        .dept-avatar.busy .dept-pulse { animation: dept-pulse 1.4s ease-in-out infinite; }
        .dept-avatar.busy .dept-typing circle { animation: dept-typing 1s ease-in-out infinite; }
        .dept-avatar.busy .dept-typing circle:nth-child(2) { animation-delay: .15s; }
        .dept-avatar.busy .dept-typing circle:nth-child(3) { animation-delay: .3s; }
        @keyframes dept-pulse { 0%,100% { opacity: .2; r: 16; } 50% { opacity: .7; r: 24; } }
        @keyframes dept-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes dept-typing { 0%,100% { opacity: .2; } 50% { opacity: 1; } }
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

    // Шахматный порядок: соседние столы смещены по вертикали.
    const DESKS = [
      { key: 'coder', x: 90, y: 112, label: 'Кодер' },
      { key: 'manager', x: 220, y: 112, label: 'Руководитель' },
      { key: 'reviewer', x: 350, y: 112, label: 'Ревьюер' },
      { key: 'analyst', x: 90, y: 232, label: 'Аналитик' },
      { key: 'tester', x: 220, y: 232, label: 'Тестер' },
      { key: 'archivist', x: 350, y: 232, label: 'Архивариус' },
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
      const assignments = React.useRef(null)
      if (!assignments.current) assignments.current = new Map()
      const byRole = new Map()
      const seats = DESKS.filter((desk) => desk.key !== 'manager')
      const taken = new Set()

      for (const entry of items) {
        let role = entry.kind === 'менеджер' ? 'manager' : assignments.current.get(entry.sessionId)
        if (entry.kind !== 'менеджер' && !role) {
          const preferred = inferRole(entry)
          const free = seats.filter((desk) => !taken.has(desk.key))
          const chosen = free.find((desk) => desk.key === preferred) ?? free[0] ?? seats[0]
          role = chosen.key
          assignments.current.set(entry.sessionId, role)
        }
        if (role !== 'manager') taken.add(role)
        if (!byRole.has(role)) byRole.set(role, entry)
      }

      const selectedEntry = items.find((entry) => entry.sessionId === selected) ?? null
      const loungeSeats = [{ x: 452, y: 168 }, { x: 522, y: 168 }, { x: 592, y: 168 }, { x: 522, y: 196 }]
      const idle = [...byRole.entries()].filter(([, entry]) => !entry.busy).map(([role, entry]) => ({ role, entry, ghost: false }))
      for (const desk of DESKS) {
        if (desk.key === 'manager') continue
        if (!byRole.has(desk.key)) idle.push({ role: desk.key, entry: null, ghost: true })
      }

      const box = (x, y, width, height, fill, extra) => h('rect', Object.assign({ x, y, width, height, fill }, extra ?? {}))
      const wall = (x, y, width, height) => h('g', null,
        box(x, y, width, height, '#3b4666'),
        box(x, y, width, 3, '#55628a'))
      const door = (x, y, width, height) => h('g', null,
        box(x, y, width, height, '#6b5a3a'),
        box(x + 2, y + 2, width - 4, height - 4, '#8a7450'))

      const monitorOn = (x, y) => h('g', null,
        box(x - 11, y, 22, 15, '#0b1220'),
        box(x - 10, y + 1, 20, 13, '#2d6cff'),
        box(x - 8, y + 3, 7, 2, '#cfe6ff'),
        box(x - 8, y + 6, 11, 2, '#cfe6ff'),
        box(x - 2, y + 15, 4, 3, '#1a2436'))

      const deskSprite = (desk) => h('g', { key: 'desk-' + desk.key },
        box(desk.x - 34, desk.y - 6, 68, 16, '#8a5a2b'),
        box(desk.x - 34, desk.y - 6, 68, 4, '#a8713a'),
        box(desk.x - 30, desk.y + 10, 4, 14, '#6b4420'),
        box(desk.x + 26, desk.y + 10, 4, 14, '#6b4420'))

      const personAtDesk = (entry, desk) => {
        const isSelected = selected === entry.sessionId
        return h('g', {
          key: entry.sessionId,
          className: 'dept-avatar busy',
          transform: 'translate(' + desk.x + ',' + desk.y + ')',
          onClick: () => onSelect(entry.sessionId),
          style: isSelected ? { filter: 'drop-shadow(0 0 4px #6fb2ff)' } : undefined,
        },
          box(-12, -22, 24, 8, '#2a3448'),
          box(-9, -32, 18, 14, '#3d7bff'),
          box(-9, -32, 18, 3, '#5b95ff'),
          box(-6, -42, 12, 11, '#f0c9a0'),
          box(-7, -44, 14, 4, '#5a3a22'),
          box(-4, -38, 2, 2, '#20304a'),
          box(2, -38, 2, 2, '#20304a'),
          monitorOn(0, -30),
          h('g', { className: 'dept-typing' },
            box(-10, -12, 5, 7, '#f0c9a0'),
            box(5, -12, 5, 7, '#f0c9a0')),
          h('rect', { className: 'dept-keyboard', x: -14, y: -14, width: 28, height: 4, fill: '#1a2436' }))
      }

      const personIdle = (entry, seat, index, ghostRole) => {
        if (!entry) {
          const desk = DESKS.find((candidate) => candidate.key === ghostRole)
          return h('g', { key: 'ghost-' + ghostRole, opacity: 0.32 },
            box(seat.x - 12, seat.y - 6, 24, 8, '#2a3448'),
            box(seat.x - 8, seat.y - 24, 16, 16, '#33405a'),
            box(seat.x - 6, seat.y - 33, 12, 10, '#3a4762'),
            h('text', { x: seat.x, y: seat.y + 16, fill: '#5a6d8f', fontSize: 8, textAnchor: 'middle' }, desk ? desk.label : ghostRole))
        }
        const reading = (index % 2) === 0
        const isSelected = selected === entry.sessionId
        return h('g', {
          key: entry.sessionId,
          className: 'dept-avatar idle',
          onClick: () => onSelect(entry.sessionId),
          style: isSelected ? { filter: 'drop-shadow(0 0 4px #6fb2ff)' } : undefined,
        },
          box(seat.x - 13, seat.y - 8, 26, 10, '#4a3a26'),
          box(seat.x - 13, seat.y - 8, 26, 3, '#5d4a30'),
          box(seat.x - 9, seat.y - 26, 18, 16, '#c25a4a'),
          box(seat.x - 6, seat.y - 36, 12, 11, '#f0c9a0'),
          box(seat.x - 7, seat.y - 38, 14, 4, '#5a3a22'),
          h('text', { x: seat.x, y: seat.y + 16, fill: '#5f7392', fontSize: 8, textAnchor: 'middle' },
            entry.kind === 'менеджер' ? 'руководитель' : (DESKS.find((desk) => desk.key === (assignments.current.get(entry.sessionId) ?? 'coder'))?.label ?? 'агент')),
          reading
            ? h('g', { className: 'dept-reading' },
                box(seat.x - 8, seat.y - 22, 16, 11, '#ece6d0'),
                box(seat.x - 6, seat.y - 21, 5, 1, '#8e8873'),
                box(seat.x - 6, seat.y - 19, 12, 1, '#8e8873'),
                box(seat.x - 6, seat.y - 17, 10, 1, '#8e8873'),
                box(seat.x - 6, seat.y - 15, 8, 1, '#8e8873'))
            : h('g', { className: 'dept-coffee' },
                box(seat.x + 6, seat.y - 22, 6, 8, '#f2f2f2'),
                box(seat.x + 7, seat.y - 21, 4, 2, '#7a4a24'),
                box(seat.x - 12, seat.y - 20, 4, 8, '#f0c9a0'),
                h('rect', { className: 'dept-steam s1', x: seat.x + 8, y: seat.y - 26, width: 2, height: 3, fill: '#d8e6ff' }),
                h('rect', { className: 'dept-steam s2', x: seat.x + 10, y: seat.y - 28, width: 2, height: 3, fill: '#d8e6ff' })))
      }

      return h(
        'div',
        { className: 'dept-root' },
        h('div', { className: 'dept-row' },
          h('div', { className: 'dept-title' }, 'Офис отдела'),
          h('div', { className: 'dept-sub' }, items.length ? 'сотрудников: ' + items.length + ' из ' + DESKS.length : 'никого нет')),
        h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'nowrap' } },
          h('div', { className: 'dept-office', style: { flex: '1 1 auto', minWidth: 0 } },
            h('svg', { viewBox: '0 0 640 400', role: 'img', 'aria-label': 'Офис ИИ-отдела', style: { imageRendering: 'pixelated' } },
              h('defs', null,
                h('pattern', { id: 'dept-floor', width: 16, height: 16, patternUnits: 'userSpaceOnUse' },
                  box(0, 0, 16, 16, '#c9b48c'),
                  box(0, 0, 16, 8, '#d3bf97'),
                  box(8, 8, 8, 8, '#d3bf97'))),
              box(0, 0, 640, 400, '#2a3350'),
              box(12, 12, 616, 376, 'url(#dept-floor)'),

              wall(12, 4, 616, 10),
              wall(12, 386, 616, 10),
              wall(4, 4, 10, 392),
              wall(626, 4, 10, 392),
              ...Array.from({ length: 5 }, (_, index) => box(40 + index * 110, 6, 44, 7, '#8fd3ff')),

              wall(404, 14, 8, 128),
              door(404, 142, 8, 34),
              wall(404, 176, 8, 116),

              wall(412, 292, 216, 8),
              wall(12, 292, 172, 8),
              door(184, 292, 40, 8),
              door(470, 292, 40, 8),
              wall(224, 292, 246, 8),
              wall(510, 292, 118, 8),

              h('text', { x: 22, y: 34, fill: '#8a96ad', fontSize: 9 }, 'OPEN SPACE'),
              h('text', { x: 420, y: 34, fill: '#8a96ad', fontSize: 9 }, 'КОМНАТА ОТДЫХА'),

              box(420, 46, 188, 10, '#5d4a30'),
              box(420, 46, 188, 3, '#6f5a3a'),
              box(436, 56, 14, 8, '#e8e2cc'),
              box(580, 56, 12, 10, '#d8d8d8'),
              box(596, 56, 12, 10, '#d8d8d8'),
              box(452, 120, 70, 26, '#8a5a2b'),
              box(452, 120, 70, 4, '#a8713a'),

              ...DESKS.map((desk) => deskSprite(desk)),
              ...DESKS.map((desk) => {
                const entry = byRole.get(desk.key)
                return entry && entry.busy ? personAtDesk(entry, desk) : null
              }),
              ...idle.slice(0, loungeSeats.length).map((item, index) => personIdle(item.entry, loungeSeats[index], index, item.role)),
              ...DESKS.map((desk) => {
                const entry = byRole.get(desk.key)
                const busy = Boolean(entry?.busy)
                return h('text', { key: 'label-' + desk.key, x: desk.x, y: desk.y + 48, fill: busy ? '#9fd0ff' : '#6f7f98', fontSize: 8, textAnchor: 'middle' },
                  desk.label + (entry ? (busy ? ' · работает' : ' · перерыв') : ' · свободно'))
              }),
            ),
          ),
          h('div', { className: 'dept-office-side', style: { flex: '0 0 340px', width: '340px' } },
            selectedEntry
              ? [
                  h('div', { className: 'dept-title' }, selectedEntry.kind === 'менеджер' ? 'Руководитель' : (DESKS.find((desk) => desk.key === (assignments.current.get(selectedEntry.sessionId) ?? inferRole(selectedEntry)))?.label ?? 'Агент')),
                  h('div', { className: 'dept-row' },
                    h('span', { className: selectedEntry.busy ? 'dept-badge ok' : 'dept-badge wait' }, selectedEntry.busy ? '● работает' : '○ перерыв'),
                    h('span', { className: 'dept-sub' }, formatElapsed(selectedEntry.elapsedMs))),
                  h('div', { className: 'dept-sub' }, 'Сейчас'),
                  h('div', { className: 'dept-pre' }, `${selectedEntry.lastAction}${selectedEntry.tool ? '\n' + selectedEntry.tool : ''}${selectedEntry.args ? '\n' + selectedEntry.args : ''}`),
                  h('div', { className: 'dept-sub' }, 'Последние действия'),
                  (selectedEntry.recent ?? []).length === 0
                    ? h('div', { className: 'dept-sub' }, 'пока нет')
                    : h('div', { className: 'dept-events' }, ...selectedEntry.recent.map((event, index) =>
                        h('div', { key: index, className: 'dept-event' },
                          h('time', null, String(new Date(event.ts).toLocaleTimeString('ru-RU'))),
                          h('span', null, event.text)))),
                ]
              : h('div', { className: 'dept-sub' }, 'Выбери человечка на схеме — здесь появятся текущее дело и последние действия.'),
          ),
        ),
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
        (detail.questions ?? []).length > 0
          ? h('div', null,
              h('div', { className: 'dept-title' }, 'Вопросы к человеку'),
              h('div', { className: 'dept-events' },
                ...(detail.questions ?? []).map((question) =>
                  h('div', { key: question.id, className: 'dept-doc' },
                    h('div', { className: 'dept-row' },
                      h('span', { className: question.status === 'open' ? 'dept-badge wait' : 'dept-badge ok' },
                        question.status === 'open' ? 'ждёт ответа' : 'отвечен'),
                      h('span', { className: 'dept-sub' }, question.id)),
                    h('div', null, question.text),
                    (question.options ?? []).length
                      ? h('div', { className: 'dept-sub' }, `варианты: ${question.options.join(' / ')}`)
                      : null,
                    question.recommended ? h('div', { className: 'dept-sub' }, `отдел выбрал: ${question.recommended}`) : null,
                    question.answer ? h('div', { className: 'dept-sub' }, `ответ: ${question.answer} (${question.answeredBy})`) : null)))) 
          : null,
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
