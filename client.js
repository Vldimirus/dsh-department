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
      approve: '/api/department/approve',
      answer: '/api/department/answer',
      amend: '/api/department/amend',
      budget: '/api/department/budget',
      blueprint: '/api/department/blueprint',
      roles: '/api/department/roles',
      projects: '/api/department/projects',
    }

    function styleOnce() {
      const css = `
        .dept-root { display: flex; flex-direction: column; gap: 12px; padding: 16px; height: 100%; overflow: auto; color: var(--dsw-alias-label-primary, #e6edf7); font-size: 13px; }
        .dept-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .dept-title { font-size: 15px; font-weight: 600; letter-spacing: .01em; }
        .dept-sub { color: var(--dsw-alias-label-tertiary, #8b98ad); font-size: 12px; }
        .dept-block { border: 1px solid var(--dsw-alias-border-secondary, #232c3d); border-radius: 12px; padding: 10px 12px; background: var(--dsw-alias-bg-secondary, #10151f); display: flex; flex-direction: column; gap: 8px; }
        .dept-block-title { font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary, #8b98ad); }
        .dept-kv { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; border-bottom: 1px dashed #1f2a3d; padding-bottom: 3px; }
        .dept-kv:last-child { border-bottom: none; }
        .dept-kv span:first-child { color: var(--dsw-alias-label-tertiary, #8b98ad); }
        .dept-form-row { display: flex; flex-direction: column; gap: 3px; }
        .dept-form-row label { font-size: 11px; color: var(--dsw-alias-label-tertiary, #8b98ad); }
        .dept-input { border: 1px solid var(--dsw-alias-border-secondary, #2a3446); background: var(--dsw-alias-bg-secondary, #121826); color: inherit; border-radius: 8px; padding: 5px 8px; font-size: 12px; min-width: 120px; }
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
        .dept-legs rect { animation: dept-walk .34s steps(2) infinite; }
        .dept-legs rect:last-child { animation-delay: .17s; }
        @keyframes dept-walk { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
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
      let style = document.getElementById('department-styles')
      if (!style) {
        style = document.createElement('style')
        style.id = 'department-styles'
        document.head.append(style)
      }
      // Перезаписываем всегда: иначе после обновления плагина остаётся старый CSS.
      if (style.textContent !== css) style.textContent = css
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

    function zoneOfPoint(point) {
      return point.x < 404 ? 'open' : 'break'
    }

    function routeTo(from, to) {
      const door = [{ x: 436, y: 159 }, { x: 404, y: 159 }, { x: 372, y: 159 }]
      if (zoneOfPoint(from) === zoneOfPoint(to)) return [to]
      const pass = zoneOfPoint(from) === 'break' ? door : [...door].reverse()
      return [...pass, to]
    }

    function routeLength(from, points) {
      let total = 0
      let previous = from
      for (const point of points) {
        total += Math.hypot(point.x - previous.x, point.y - previous.y)
        previous = point
      }
      return total
    }

    function pointAlong(from, points, ratio) {
      const total = routeLength(from, points)
      let covered = total * ratio
      let previous = from
      for (const point of points) {
        const length = Math.hypot(point.x - previous.x, point.y - previous.y)
        if (covered <= length || point === points[points.length - 1]) {
          const local = length === 0 ? 0 : Math.min(1, covered / length)
          return { x: previous.x + (point.x - previous.x) * local, y: previous.y + (point.y - previous.y) * local }
        }
        covered -= length
        previous = point
      }
      return points[points.length - 1] ?? from
    }

    function OfficeView({ items, selected, onSelect, tasks, onOpenTask }) {
      const assignments = React.useRef(null)
      if (!assignments.current) assignments.current = new Map()
      const settled = React.useRef(new Map())
      if (!settled.current) settled.current = new Map()
      const plans = React.useRef(new Map())
      const [, setFrame] = React.useState(0)
      React.useEffect(() => {
        const timer = setInterval(() => setFrame((value) => value + 1), 250)
        return () => clearInterval(timer)
      }, [])

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
      const selectedTask = selectedEntry && tasks ? tasks.find((task) => task.root === selectedEntry.cwd) : null
      const projectName = (cwd) => String(cwd ?? '').split('/').filter(Boolean).pop() ?? '—'
      const filesOf = (entry) => {
        const text = [entry?.args ?? '', ...(entry?.recent ?? []).map((event) => event.text)].join(' ')
        const matches = text.match(/[\w./-]+\.(?:js|mjs|md|json|html|css)/g) ?? []
        return [...new Set(matches.map((file) => file.replace(/^\.\//, '')))].slice(0, 8)
      }
      const chairSeats = [{ x: 446, y: 152 }, { x: 520, y: 152 }, { x: 594, y: 152 }, { x: 520, y: 198 }]
      const coolerSpot = { x: 570, y: 252 }
      const windowSpot = { x: 466, y: 66 }
      const loungeTargets = [...chairSeats.map((seat, index) => ({ kind: 'seat', spot: seat, index })), { kind: 'cooler', spot: coolerSpot }, { kind: 'window', spot: windowSpot }]
      const time = Date.now()

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
      const plant = (x, y) => h('g', null,
        box(x - 7, y, 14, 10, '#8a5a2b'),
        box(x - 7, y, 14, 3, '#a8713a'),
        box(x - 9, y - 14, 18, 14, '#3f8a4f'),
        box(x - 6, y - 18, 12, 6, '#4fa05e'),
        box(x - 3, y - 21, 6, 5, '#5cb06c'))
      const cooler = (x, y) => h('g', null,
        box(x - 8, y - 10, 16, 22, '#dfe6ee'),
        box(x - 8, y - 10, 16, 3, '#f2f6fa'),
        box(x - 6, y - 24, 12, 14, '#7fc4ff'),
        box(x - 6, y - 24, 12, 3, '#a8d8ff'),
        box(x - 2, y - 4, 4, 3, '#9aa7b8'))
      const chair = (x, y) => h('g', null,
        box(x - 9, y - 4, 18, 6, '#4a3a26'),
        box(x - 9, y - 4, 18, 2, '#5d4a30'),
        box(x - 9, y - 16, 18, 4, '#4a3a26'),
        box(x + 7, y - 16, 3, 12, '#3a2d1d'))
      const deskSprite = (desk) => h('g', { key: 'desk-' + desk.key },
        box(desk.x - 34, desk.y - 6, 68, 16, '#8a5a2b'),
        box(desk.x - 34, desk.y - 6, 68, 4, '#a8713a'),
        box(desk.x - 30, desk.y + 10, 4, 14, '#6b4420'),
        box(desk.x + 26, desk.y + 10, 4, 14, '#6b4420'),
        box(desk.x + 16, desk.y - 14, 5, 5, '#efe9d6'),
        box(desk.x + 16, desk.y - 14, 5, 2, '#c25a4a'),
        box(desk.x - 26, desk.y - 13, 9, 6, '#efe9d6'))

      const personAtDesk = (entry, desk) => {
        const isSelected = selected === entry.sessionId
        return h('g', {
          key: entry.sessionId,
          className: 'dept-avatar busy',
          transform: 'translate(' + desk.x + ',' + desk.y + ')',
          onClick: () => onSelect(entry.sessionId),
          style: isSelected ? { filter: 'drop-shadow(0 0 4px #6fb2ff)' } : undefined,
        },
          box(-12, -24, 24, 9, '#2a3448'),
          box(-9, -34, 18, 15, '#3d7bff'),
          box(-9, -34, 18, 3, '#5b95ff'),
          box(-6, -45, 12, 12, '#f0c9a0'),
          box(-7, -47, 14, 4, '#5a3a22'),
          box(-4, -41, 2, 2, '#20304a'),
          box(2, -41, 2, 2, '#20304a'),
          monitorOn(0, -20),
          h('g', { className: 'dept-typing' },
            box(-10, -13, 5, 7, '#f0c9a0'),
            box(5, -13, 5, 7, '#f0c9a0')),
          h('rect', { className: 'dept-keyboard', x: -14, y: -15, width: 28, height: 4, fill: '#1a2436' }))
      }

      const seatedPerson = (entry, desk, index) => {
        const isSelected = selected === entry.sessionId
        const reading = (index % 2) === 0
        return h('g', {
          key: 'seat-' + entry.sessionId,
          className: 'dept-avatar idle',
          transform: 'translate(' + desk.x + ',' + desk.y + ')',
          onClick: () => onSelect(entry.sessionId),
          style: isSelected ? { filter: 'drop-shadow(0 0 4px #6fb2ff)' } : undefined,
        },
          box(-9, -28, 18, 17, '#c25a4a'),
          box(-6, -38, 12, 12, '#f0c9a0'),
          box(-7, -40, 14, 4, '#5a3a22'),
          reading ? h('g', { className: 'dept-reading' },
              box(-9, -24, 18, 12, '#ece6d0'),
              box(-7, -23, 6, 1, '#8e8873'),
              box(-7, -21, 14, 1, '#8e8873'),
              box(-7, -19, 11, 1, '#8e8873'))
            : h('g', { className: 'dept-coffee' },
                box(6, -24, 6, 9, '#f2f2f2'),
                box(7, -23, 4, 2, '#7a4a24'),
                box(-12, -22, 4, 9, '#f0c9a0'),
                h('rect', { className: 'dept-steam s1', x: 8, y: -29, width: 2, height: 3, fill: '#d8e6ff' }),
                h('rect', { className: 'dept-steam s2', x: 10, y: -31, width: 2, height: 3, fill: '#d8e6ff' })),
          h('text', { x: 0, y: 18, fill: '#5f7392', fontSize: 8, textAnchor: 'middle' },
            entry.kind === 'менеджер' ? 'руководитель' : (DESKS.find((desk) => desk.key === (assignments.current.get(entry.sessionId) ?? 'coder'))?.label ?? 'агент')))
      }

      const standingPerson = (entry, spot, looking) => {
        const isSelected = selected === entry.sessionId
        return h('g', {
          key: 'stand-' + entry.sessionId,
          className: 'dept-avatar',
          style: {
            transform: 'translate(' + spot.x + 'px,' + spot.y + 'px)',
            transition: 'transform 1.2s linear',
            filter: isSelected ? 'drop-shadow(0 0 4px #6fb2ff)' : undefined,
          },
          onClick: () => onSelect(entry.sessionId),
        },
          h('ellipse', { cx: 0, cy: 1, rx: 9, ry: 3, fill: '#00000022' }),
          box(-8, -34, 16, 18, '#c25a4a'),
          box(-6, -45, 12, 12, '#f0c9a0'),
          box(-7, -47, 14, 4, '#5a3a22'),
          box(-8, -16, 6, 15, '#2a3448'),
          box(2, -16, 6, 15, '#2a3448'),
          looking === 'window' ? h('g', { className: 'dept-reading' }, box(-9, -40, 18, 8, '#cfe6ff'), box(-8, -39, 16, 6, '#8fd3ff'))
            : h('g', { className: 'dept-coffee' },
                box(8, -30, 6, 8, '#f2f2f2'),
                box(9, -29, 4, 2, '#7a4a24'),
                h('rect', { className: 'dept-steam s1', x: 10, y: -34, width: 2, height: 3, fill: '#d8e6ff' })))
      }

      const walkingPerson = (entry, spot) => {
        const isSelected = selected === entry.sessionId
        return h('g', {
          key: 'walk-' + entry.sessionId,
          className: 'dept-avatar walking',
          style: {
            transform: 'translate(' + spot.x + 'px,' + spot.y + 'px)',
            transition: 'transform .34s linear',
            filter: isSelected ? 'drop-shadow(0 0 4px #6fb2ff)' : undefined,
          },
          onClick: () => onSelect(entry.sessionId),
        },
          h('ellipse', { cx: 0, cy: 1, rx: 9, ry: 3, fill: '#00000022' }),
          box(-8, -34, 16, 18, '#c25a4a'),
          box(-6, -45, 12, 12, '#f0c9a0'),
          box(-7, -47, 14, 4, '#5a3a22'),
          h('g', { className: 'dept-legs' },
            box(-8, -16, 6, 15, '#2a3448'),
            box(2, -16, 6, 15, '#2a3448')))
      }

      const actors = []
      for (const [role, entry] of byRole.entries()) {
        const id = entry.sessionId
        const desk = DESKS.find((candidate) => candidate.key === role)
        const target = entry.busy
          ? { kind: 'desk', spot: { x: desk.x, y: desk.y } }
          : (() => {
              const index = [...byRole.keys()].indexOf(role)
              const pick = loungeTargets[(id.length + Math.floor(time / 14000) + index) % loungeTargets.length]
              return { kind: pick.kind, spot: pick.spot, index: pick.index ?? index }
            })()
        if (!settled.current.has(id)) settled.current.set(id, { x: chairSeats[actors.length % chairSeats.length].x, y: chairSeats[actors.length % chairSeats.length].y, mode: 'seat', index: actors.length })
        const current = settled.current.get(id)
        const plan = plans.current.get(id)
        if (plan) {
          const ratio = Math.min(1, (time - plan.start) / plan.duration)
          const position = pointAlong(plan.from, plan.points, ratio)
          if (ratio >= 1) {
            plans.current.delete(id)
            settled.current.set(id, { x: plan.target.spot.x, y: plan.target.spot.y, mode: plan.target.kind, index: plan.target.index ?? current.index })
            actors.push({ entry, mode: plan.target.kind, spot: plan.target.spot, index: plan.target.index ?? current.index, desk })
          } else {
            actors.push({ entry, mode: 'walk', spot: position, index: current.index, desk })
          }
        } else {
          const moved = current.mode !== target.kind || Math.hypot(current.x - target.spot.x, current.y - target.spot.y) > 2
          if (moved) {
            const points = routeTo({ x: current.x, y: current.y }, target.spot)
            const duration = Math.min(11000, Math.max(3000, routeLength({ x: current.x, y: current.y }, points) * 48))
            plans.current.set(id, { from: { x: current.x, y: current.y }, points, start: time, duration, target })
            actors.push({ entry, mode: 'walk', spot: current, index: current.index, desk })
          } else {
            actors.push({ entry, mode: current.mode, spot: { x: current.x, y: current.y }, index: current.index, desk })
          }
        }
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
              wall(12, 4, 616, 10), wall(12, 386, 616, 10), wall(4, 4, 10, 392), wall(626, 4, 10, 392),
              ...Array.from({ length: 5 }, (_, index) => box(40 + index * 110, 6, 44, 7, '#8fd3ff')),
              wall(404, 14, 8, 128), door(404, 142, 8, 34), wall(404, 176, 8, 116),
              wall(412, 292, 216, 8), wall(12, 292, 172, 8), door(184, 292, 40, 8), door(470, 292, 40, 8), wall(510, 292, 118, 8),
              h('text', { x: 22, y: 34, fill: '#8a96ad', fontSize: 9 }, 'OPEN SPACE'),
              h('text', { x: 420, y: 34, fill: '#8a96ad', fontSize: 9 }, 'КОМНАТА ОТДЫХА'),
              plant(26, 268), plant(386, 24), plant(26, 24), plant(618, 276),
              cooler(366, 58),
              // диван вдоль стены комнаты отдыха
              box(420, 44, 200, 10, '#5d4a30'),
              box(420, 44, 200, 3, '#6f5a3a'),
              box(426, 54, 188, 14, '#7a6244'),
              box(426, 54, 188, 2, '#8a7050'),
              // кофейный столик
              box(470, 112, 100, 28, '#8a5a2b'),
              box(470, 112, 100, 4, '#a8713a'),
              box(474, 140, 4, 12, '#6b4420'),
              box(562, 140, 4, 12, '#6b4420'),
              // кофемашина
              box(590, 58, 26, 32, '#dfe6ee'),
              box(590, 58, 26, 3, '#f2f6fa'),
              box(592, 44, 22, 14, '#3d7bff'),
              box(596, 74, 14, 4, '#9aa7b8'),
              // кулер
              cooler(596, 250),
              chair(446, 152), chair(520, 152), chair(594, 152), chair(520, 198),
              ...DESKS.map((desk) => deskSprite(desk)),
              ...DESKS.map((desk) => {
                const entry = byRole.get(desk.key)
                if (!entry) return monitorOn(desk.x, desk.y - 20)
                const actor = actors.find((item) => item.entry.sessionId === entry.sessionId)
                return actor && actor.mode === 'desk' ? personAtDesk(entry, desk) : null
              }),
              ...actors.map((actor) => {
                if (actor.mode === 'desk') return null
                if (actor.mode === 'walk') return walkingPerson(actor.entry, actor.spot)
                return actor.mode === 'seat' ? seatedPerson(actor.entry, actor.spot, actor.index) : standingPerson(actor.entry, actor.spot, actor.mode)
              }),
              ...DESKS.map((desk) => {
                const entry = byRole.get(desk.key)
                const actor = entry ? actors.find((item) => item.entry.sessionId === entry.sessionId) : null
                const busy = Boolean(entry?.busy)
                const atDesk = actor?.mode === 'desk'
                return h('text', { key: 'label-' + desk.key, x: desk.x, y: desk.y + 48, fill: atDesk ? '#9fd0ff' : '#6f7f98', fontSize: 8, textAnchor: 'middle' },
                  desk.label + (entry ? (atDesk ? ' · работает' : busy ? ' · идёт' : ' · перерыв') : ' · свободно'))
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
                  h('div', { className: 'dept-sub' }, 'Проект: ' + projectName(selectedEntry.cwd) + (selectedTask ? ' · ' + selectedTask.taskId + ' · ' + selectedTask.stage : '')),
                  h('div', { className: 'dept-sub' }, 'Сейчас'),
                  h('div', { className: 'dept-pre' }, `${selectedEntry.lastAction}${selectedEntry.tool ? '\n' + selectedEntry.tool : ''}${selectedEntry.args ? '\n' + selectedEntry.args : ''}`),
                  (filesOf(selectedEntry).length ? h('div', { className: 'dept-sub' }, 'Файлы: ' + filesOf(selectedEntry).join(', ')) : null),
                  h('div', { className: 'dept-sub' }, 'Последние действия'),
                  (selectedEntry.recent ?? []).length === 0
                    ? h('div', { className: 'dept-sub' }, 'пока нет')
                    : h('div', { className: 'dept-events' }, ...selectedEntry.recent.map((event, index) =>
                        h('div', { key: index, className: 'dept-event' },
                          h('time', null, String(new Date(event.ts).toLocaleTimeString('ru-RU'))),
                          h('span', null, event.text)))),
                  selectedTask ? h('button', { className: 'dept-btn', onClick: () => onOpenTask(selectedEntry.cwd) }, 'Открыть задачу') : null,
                ]
              : h('div', { className: 'dept-sub' }, 'Выбери человечка на схеме — здесь появятся проект, файлы и история.'),
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

    function TaskDetail({ detail, onBack, onReload }) {
      const docs = ['task.md', 'analysis.md', 'concept.md', 'spec.md', 'plan.md', 'backlog.md']
      const [tab, setTab] = useState('overview')
      const [name, setName] = useState(() => localStorage.getItem('dept-approver') || 'vladimir')
      const [budget, setBudget] = useState(detail.budget ?? null)
      const [drafts, setDrafts] = useState({})
      const [amend, setAmend] = useState({ doc: 'spec', summary: '', reason: '' })
      const [roles, setRoles] = useState([])
      const [prices, setPrices] = useState({ limit: '', input: '', output: '', rate: '' })
      const [savingBudget, setSavingBudget] = useState(false)
      const [busy, setBusy] = useState(false)
      const [message, setMessage] = useState(null)

      useEffect(() => { localStorage.setItem('dept-approver', name) }, [name])
      useEffect(() => {
        api(`${ROUTES.budget}?root=${encodeURIComponent(detail.root)}&taskId=${encodeURIComponent(detail.taskId)}`)
          .then((payload) => setBudget(payload.budget))
          .catch(() => {})
      }, [detail.taskId, detail.events?.length])
      useEffect(() => {
        api(`${ROUTES.roles}?root=${encodeURIComponent(detail.root)}&taskId=${encodeURIComponent(detail.taskId)}`)
          .then((payload) => setRoles(payload.roles ?? []))
          .catch(() => {})
      }, [detail.taskId])

      useEffect(() => {
        if (!budget) return
        setPrices({
          limit: String(budget.limitTokens ?? ''),
          input: String(budget.prices?.inputTokens ?? 0.27),
          output: String(budget.prices?.outputTokens ?? 1.1),
          rate: String(budget.rateRUB ?? 90),
        })
      }, [budget?.limitTokens, budget?.rateRUB])

      async function savePrices() {
        setSavingBudget(true)
        try {
          const response = await fetch(ROUTES.budget, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              root: detail.root,
              taskId: detail.taskId,
              limitTokens: Number(prices.limit) || 0,
              rateRUB: Number(prices.rate) || 0,
              prices: {
                inputTokens: Number(prices.input) || 0,
                outputTokens: Number(prices.output) || 0,
                cacheReadTokens: Number(prices.input) / 3,
                cacheWriteTokens: Number(prices.input) || 0,
              },
            }),
          })
          const data = await response.json().catch(() => ({}))
          setMessage(response.ok ? 'Цены сохранены' : (data.error || 'ошибка'))
        } finally {
          setSavingBudget(false)
        }
      }

      async function post(path, body) {
        setBusy(true)
        setMessage(null)
        try {
          const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, by: name }) })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || response.statusText)
          setMessage('Готово')
          if (onReload) onReload()
          return data
        } catch (problem) {
          setMessage(problem.message)
          return null
        } finally {
          setBusy(false)
        }
      }

      const approved = new Set(detail.approvals ?? [])
      const openQuestions = (detail.questions ?? []).filter((question) => question.status === 'open')
      const answeredQuestions = (detail.questions ?? []).filter((question) => question.status !== 'open')
      const usage = budget?.usage
      const tokens = usage ? usage.inputTokens + usage.outputTokens : budget?.usedTokens ?? 0
      const costRub = budget?.costUSD && budget?.rateRUB ? budget.costUSD * budget.rateRUB : null

      const kv = (label, value) => h('div', { className: 'dept-kv' }, h('span', null, label), h('span', null, String(value)))
      const tabs = [
        ['overview', 'Обзор'],
        ['docs', 'Документы'],
        ['questions', `Вопросы${openQuestions.length ? ' (' + openQuestions.length + ')' : ''}`],
        ['audit', 'Аудит'],
        ['events', 'События'],
        ['roles', 'Роли'],
        ['billing', 'Бюджет'],
        ['git', 'Git'],
      ]

      const content = (() => {
        if (tab === 'docs') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Документы задачи'),
            h('div', { className: 'dept-grid' }, ...docs.map((file) =>
              h('div', { key: file, className: `dept-doc ${detail.files?.[file] ? '' : 'missing'}` }, `${file}${detail.files?.[file] ? '' : ' — нет'}`))))
        }
        if (tab === 'questions') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Открытые вопросы'),
            openQuestions.length === 0
              ? h('div', { className: 'dept-sub' }, 'Открытых вопросов нет.')
              : h('div', { className: 'dept-events' }, ...openQuestions.map((question) =>
                  h('div', { key: question.id, className: 'dept-block', style: { gap: '6px' } },
                    h('div', { className: 'dept-row' },
                      h('span', { className: 'dept-badge wait' }, 'ждёт ответа'),
                      h('span', { className: 'dept-sub' }, question.id)),
                    h('div', null, question.text),
                    question.recommended ? h('div', { className: 'dept-sub' }, `отдел выбрал: ${question.recommended}`) : null,
                    h('div', { className: 'dept-row' },
                      h('input', {
                        className: 'dept-input',
                        placeholder: question.options?.length ? question.options.join(' / ') : 'ответ',
                        value: drafts[question.id] ?? '',
                        onChange: (event) => setDrafts({ ...drafts, [question.id]: event.target.value }),
                      }),
                      h('button', {
                        className: 'dept-btn',
                        disabled: busy || !(drafts[question.id] ?? '').trim(),
                        onClick: () => post(ROUTES.answer, { root: detail.root, taskId: detail.taskId, questionId: question.id, answer: (drafts[question.id] ?? '').trim() }),
                      }, 'Ответить'))))),
            answeredQuestions.length > 0
              ? h('div', null,
                  h('div', { className: 'dept-block-title' }, 'Отвеченные'),
                  h('div', { className: 'dept-events' }, ...answeredQuestions.map((question) =>
                    h('div', { key: question.id, className: 'dept-event' },
                      h('span', { className: 'dept-badge ok' }, 'отвечен'),
                      h('span', null, question.answer),
                      h('span', { className: 'dept-sub' }, question.answeredBy)))))
              : null)
        }
        if (tab === 'audit') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Аудит dept_verify'),
            ...(detail.audit?.checks ?? []).map((check) =>
              h('div', { key: check.id, className: 'dept-kv' },
                h('span', null, check.id),
                h('span', { className: check.ok ? 'dept-badge ok' : 'dept-badge fail' }, check.ok ? 'OK' : 'FAIL'))),
            h('div', { className: 'dept-sub' }, detail.audit?.ok ? 'Итог: PASS' : 'Итог: FAIL'))
        }
        if (tab === 'events') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Журнал событий'),
            h('div', { className: 'dept-events' }, ...(detail.events ?? []).map((event) =>
              h('div', { key: event.id, className: 'dept-event' },
                h('time', null, String(event.ts).replace('T', ' ').slice(0, 19)),
                h('span', null, `${event.actor}: ${event.action}${event.detail ? ' — ' + event.detail : ''}`)))))
        }
        if (tab === 'roles') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Роли и модели'),
            h('div', { className: 'dept-sub' }, 'Модель и reasoning для каждой роли. Пустая модель — по умолчанию.'),
            ...roles.map((role) =>
              h('div', { key: role.name, className: 'dept-kv', style: { alignItems: 'center', gap: '6px' } },
                h('input', {
                  type: 'checkbox',
                  checked: role.enabled !== false,
                  disabled: role.core,
                  title: role.core ? 'основная роль — всегда включена' : 'включить/выключить роль',
                  onChange: async (event) => {
                    const response = await fetch(ROUTES.roles, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ root: detail.root, taskId: detail.taskId, role: role.name, model: role.model, reasoning: role.reasoning, enabled: event.target.checked }),
                    })
                    const data = await response.json().catch(() => ({}))
                    if (response.ok) { setRoles(data.roles); setMessage(event.target.checked ? 'Роль включена' : 'Роль выключена') } else { setMessage(data.error || 'ошибка') }
                  },
                }),
                h('span', { style: { minWidth: '120px' } }, role.title + (role.core ? ' · основная' : '')),
                h('input', {
                  type: 'number', min: 1, max: 10,
                  className: 'dept-input', style: { width: '64px', minWidth: '64px' },
                  title: 'сколько экземпляров роли можно запускать одновременно',
                  value: role.maxInstances ?? 1,
                  onChange: async (event) => {
                    const value = Number(event.target.value)
                    const response = await fetch(ROUTES.roles, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ root: detail.root, taskId: detail.taskId, role: role.name, model: role.model, reasoning: role.reasoning, enabled: role.enabled, maxInstances: value }),
                    })
                    const data = await response.json().catch(() => ({}))
                    if (response.ok) { setRoles(data.roles); setMessage('Лимит роли сохранён') } else { setMessage(data.error || 'ошибка') }
                  },
                }),
                h('input', {
                  className: 'dept-input',
                  placeholder: 'model (default)',
                  value: role.model ?? '',
                  onChange: (event) => setRoles(roles.map((item) => item.name === role.name ? { ...item, model: event.target.value } : item)),
                }),
                h('select', {
                  className: 'dept-input',
                  value: role.reasoning ?? '',
                  onChange: (event) => setRoles(roles.map((item) => item.name === role.name ? { ...item, reasoning: event.target.value } : item)),
                },
                  h('option', { value: '' }, 'default'),
                  h('option', { value: 'low' }, 'low'),
                  h('option', { value: 'medium' }, 'medium'),
                  h('option', { value: 'high' }, 'high')),
                h('button', {
                  className: 'dept-btn',
                  disabled: busy,
                  onClick: async () => {
                    const response = await fetch(ROUTES.roles, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ root: detail.root, taskId: detail.taskId, role: role.name, model: role.model, reasoning: role.reasoning }) })
                    const data = await response.json().catch(() => ({}))
                    if (response.ok) { setRoles(data.roles); setMessage('Роль сохранена') } else { setMessage(data.error || 'ошибка') }
                  },
                }, 'Сохранить'))))
        }
        if (tab === 'billing') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Бюджет и цены'),
            h('div', { className: 'dept-sub' }, 'Лимит и цены за 1M токенов; курс — для пересчёта в рубли.'),
            h('div', { className: 'dept-row' },
              h('div', { className: 'dept-form-row' },
                h('label', null, 'Лимит токенов'),
                h('input', { className: 'dept-input', value: prices.limit, onChange: (event) => setPrices({ ...prices, limit: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, '$/1M вход'),
                h('input', { className: 'dept-input', value: prices.input, onChange: (event) => setPrices({ ...prices, input: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, '$/1M выход'),
                h('input', { className: 'dept-input', value: prices.output, onChange: (event) => setPrices({ ...prices, output: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, 'курс ₽'),
                h('input', { className: 'dept-input', value: prices.rate, onChange: (event) => setPrices({ ...prices, rate: event.target.value }) }))),
            h('div', { className: 'dept-row' },
              h('button', { className: 'dept-btn', disabled: savingBudget, onClick: savePrices }, 'Сохранить цены'),
              h('span', { className: 'dept-sub' }, message ?? '')),
            (budget?.history ?? []).length > 0
              ? h('div', null,
                  h('div', { className: 'dept-block-title' }, 'По этапам'),
                  ...(budget.history ?? []).map((item, index) =>
                    h('div', { key: index, className: 'dept-kv' },
                      h('span', null, 'этап ' + item.stage),
                      h('span', null, item.tokens.toLocaleString('ru-RU') + ' т. · $' + Number(item.costUSD).toFixed(2)))))
              : null)
        }
        if (tab === 'git') {
          return h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Коммиты'),
            h('div', { className: 'dept-pre' }, (detail.recentCommits ?? []).join('\n') || 'нет коммитов'),
            h('div', { className: 'dept-block-title' }, 'Теги'),
            h('div', { className: 'dept-sub' }, (detail.tags ?? []).join(', ') || '—'),
            h('div', { className: 'dept-block-title' }, 'Ветка'),
            h('div', { className: 'dept-sub' }, detail.currentBranch ?? detail.branch))
        }
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Открытые вопросы'),
            openQuestions.length === 0
              ? h('div', { className: 'dept-sub' }, 'нет')
              : h('div', { className: 'dept-events' }, ...openQuestions.map((question) =>
                  h('div', { key: question.id, className: 'dept-event' }, h('span', null, question.text))))),
          h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Документы'),
            h('div', { className: 'dept-row' }, ...docs.map((file) =>
              h('span', { key: file, className: 'dept-badge ' + (detail.files?.[file] ? 'ok' : 'wait') }, file)))),
          h('div', { className: 'dept-block' },
            h('div', { className: 'dept-block-title' }, 'Последние события'),
            h('div', { className: 'dept-events' }, ...(detail.events ?? []).slice(0, 8).map((event) =>
              h('div', { key: event.id, className: 'dept-event' },
                h('time', null, String(event.ts).replace('T', ' ').slice(5, 19)),
                h('span', null, event.actor + ': ' + event.action))))))
      })()

      return h('div', { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, detail.title),
            h('div', { className: 'dept-sub' }, `${detail.taskId} · ${detail.stage} · ${detail.progress}% · ${detail.currentBranch ?? detail.branch}`)),
          h('div', { className: 'dept-row' },
            h('input', { className: 'dept-input', value: name, onChange: (event) => setName(event.target.value), placeholder: 'ваше имя', title: 'Имя для подписи' }),
            h('button', { className: 'dept-btn', onClick: onBack }, '← К доске'))),
        h('div', { className: 'dept-tabs' }, ...tabs.map(([key, label]) =>
          h('button', { key, className: 'dept-btn' + (tab === key ? ' active' : ''), onClick: () => setTab(key) }, label))),
        h('div', { style: { display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: '12px', alignItems: 'start' } },
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            h('div', { className: 'dept-block' },
              h('div', { className: 'dept-block-title' }, 'Состояние'),
              kv('Этап', detail.stage),
              kv('Попытки (провалы)', detail.attempts),
              kv('Тесты', detail.tests),
              kv('Ревью', detail.review),
              kv('Токены', `${tokens.toLocaleString('ru-RU')} / ${(budget?.limitTokens ?? 0).toLocaleString('ru-RU')}`),
              kv('Стоимость', `${budget?.costUSD ? '$' + budget.costUSD.toFixed(2) : '—'}${costRub ? ' ≈ ' + costRub.toFixed(0) + ' ₽' : ''}`),
              kv('Вызовов модели', usage?.calls ?? 0),
              h('div', { className: 'dept-bar' }, h('i', { style: { width: `${detail.progress}%` } }))),
            (detail.stage === 'concept' && !approved.has('concept')) || (detail.stage === 'spec' && !approved.has('spec'))
              ? h('div', { className: 'dept-block' },
                  h('div', { className: 'dept-block-title' }, 'Утверждение'),
                  detail.stage === 'concept'
                    ? h('button', { className: 'dept-btn', disabled: busy, onClick: () => post(ROUTES.approve, { root: detail.root, taskId: detail.taskId, doc: 'concept' }) }, 'Утвердить концепцию')
                    : h('button', { className: 'dept-btn', disabled: busy, onClick: () => post(ROUTES.approve, { root: detail.root, taskId: detail.taskId, doc: 'spec' }) }, 'Утвердить ТЗ'))
              : null,
            h('div', { className: 'dept-block' },
              h('div', { className: 'dept-block-title' }, 'Поправка к документу'),
              h('div', { className: 'dept-form-row' },
                h('label', null, 'Документ'),
                h('select', { className: 'dept-input', value: amend.doc, onChange: (event) => setAmend({ ...amend, doc: event.target.value }) },
                  h('option', { value: 'concept' }, 'Концепция'),
                  h('option', { value: 'spec' }, 'ТЗ'),
                  h('option', { value: 'plan' }, 'План'))),
              h('div', { className: 'dept-form-row' },
                h('label', null, 'Что меняется'),
                h('input', { className: 'dept-input', value: amend.summary, onChange: (event) => setAmend({ ...amend, summary: event.target.value }) })),
              h('div', { className: 'dept-form-row' },
                h('label', null, 'Почему'),
                h('input', { className: 'dept-input', value: amend.reason, onChange: (event) => setAmend({ ...amend, reason: event.target.value }) })),
              h('button', {
                className: 'dept-btn',
                disabled: busy || !amend.summary.trim(),
                onClick: async () => {
                  const result = await post(ROUTES.amend, { root: detail.root, taskId: detail.taskId, doc: amend.doc, summary: amend.summary.trim(), reason: amend.reason.trim() })
                  if (result) setAmend({ ...amend, summary: '', reason: '' })
                },
              }, 'Подписать поправку'))),
          content,
        ),
        message ? h('div', { className: 'dept-sub' }, message) : null,
      )
    }

    /* ---------------- Схема проекта ---------------- */

    const BLUEPRINT_COLORS = ['#4b8bff', '#7fdc9a', '#d8c07a', '#c25a4a', '#9b7bff', '#6fd4e0', '#e08ab0']

    function BlueprintView({ tasks }) {
      const roots = [...new Set((tasks ?? []).map((task) => task.root))]
      const [root, setRoot] = useState(roots[0] ?? null)
      const [blueprint, setBlueprint] = useState(null)
      const [error, setError] = useState(null)
      const [loading, setLoading] = useState(false)
      const [group, setGroup] = useState(null)
      const [file, setFile] = useState(null)
      const [mode, setMode] = useState('dir')

      useEffect(() => {
        if (!root) return
        setLoading(true)
        setGroup(null)
        setFile(null)
        api(`${ROUTES.blueprint}?root=${encodeURIComponent(root)}`)
          .then((payload) => { setBlueprint(payload.blueprint); setError(null) })
          .catch((problem) => setError(problem.message))
          .finally(() => setLoading(false))
      }, [root])

      if (!root) return h('div', { className: 'dept-root' }, h('div', { className: 'dept-empty' }, 'Нет проектов с задачами.'))

      const files = blueprint?.files ?? []
      const edges = blueprint?.edges ?? []
      const groupKey = (item) => (mode === 'layer' ? item.layer : item.dir)
      const groups = new Map()
      for (const item of files) {
        const key = groupKey(item)
        if (!groups.has(key)) groups.set(key, { dir: key, files: [], loc: 0 })
        const bucket = groups.get(key)
        bucket.files.push(item)
        bucket.loc += item.loc
      }
      const groupList = [...groups.values()].sort((a, b) => b.files.length - a.files.length)
      const LAYER_TITLES = { core: 'Ядро', ui: 'Интерфейс', tests: 'Тесты', docs: 'Документы' }
      const groupName = (dir) => (mode === 'layer' ? (LAYER_TITLES[dir] ?? dir) : (dir === '.' ? '(корень)' : dir))
      const colorOf = (dir) => BLUEPRINT_COLORS[Math.max(0, groupList.findIndex((item) => item.dir === dir)) % BLUEPRINT_COLORS.length]

      // связи между группами
      const groupEdges = new Map()
      for (const edge of edges) {
        const fromFile = files.find((item) => item.path === edge.from)
        const toFile = files.find((item) => item.path === edge.to)
        if (!fromFile || !toFile || fromFile.dir === toFile.dir) continue
        const key = fromFile.dir + ' -> ' + toFile.dir
        groupEdges.set(key, (groupEdges.get(key) ?? 0) + 1)
      }

      const groupsView = () => {
        const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(groupList.length))))
        const rows = Math.ceil(groupList.length / columns)
        const cellW = 150
        const cellH = 100
        const offsetX = Math.max(20, (640 - columns * cellW) / 2)
        const offsetY = Math.max(20, (420 - rows * cellH) / 2)
        const positions = new Map()
        groupList.forEach((item, index) => {
          const col = index % columns
          const row = Math.floor(index / columns)
          positions.set(item.dir, { x: offsetX + col * cellW, y: offsetY + row * cellH })
        })
        return h('svg', { viewBox: '0 0 640 420' },
          h('rect', { x: 0, y: 0, width: 640, height: 420, fill: '#141a28' }),
          ...[...groupEdges.entries()].map(([key, count], index) => {
            const [fromDir, toDir] = key.split(' -> ')
            const from = positions.get(fromDir)
            const to = positions.get(toDir)
            if (!from || !to) return null
            return h('g', { key: 'ge' + index },
              h('line', { x1: from.x + 55, y1: from.y + 30, x2: to.x + 55, y2: to.y + 30, stroke: '#3a4a6a', strokeWidth: Math.min(4, 1 + count * 0.4), opacity: 0.7 }))
          }),
          ...groupList.map((item) => {
            const position = positions.get(item.dir)
            const color = colorOf(item.dir)
            return h('g', { key: item.dir, style: { cursor: 'pointer' }, onClick: () => { setGroup(item.dir); setFile(null) } },
              h('rect', { x: position.x, y: position.y, width: 110, height: 62, rx: 10, fill: '#1b2438', stroke: color, strokeWidth: 1.5 }),
              h('text', { x: position.x + 8, y: position.y + 20, fill: '#e6edf7', fontSize: 9 }, groupName(item.dir).slice(0, 16)),
              h('text', { x: position.x + 8, y: position.y + 36, fill: '#8b98ad', fontSize: 8 }, `файлов: ${item.files.length}`),
              h('text', { x: position.x + 8, y: position.y + 50, fill: '#8b98ad', fontSize: 8 }, `строк: ${item.loc}`),
              h('circle', { cx: position.x + 98, cy: position.y + 12, r: 4, fill: color }))
          }))
      }

      const filesView = (dir) => {
        const bucket = groups.get(dir)
        const items = bucket.files
        const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(items.length))))
        const rows = Math.ceil(items.length / columns)
        const cellW = 140
        const cellH = 84
        const offsetX = Math.max(40, (640 - columns * cellW) / 2)
        const offsetY = Math.max(40, (400 - rows * cellH) / 2)
        const positions = new Map()
        items.forEach((item, index) => {
          positions.set(item.path, { x: offsetX + (index % columns) * cellW, y: offsetY + Math.floor(index / columns) * cellH })
        })
        const inner = edges.filter((edge) => positions.has(edge.from) && positions.has(edge.to))
        const outer = edges.filter((edge) => (positions.has(edge.from) && !positions.has(edge.to)) || (!positions.has(edge.from) && positions.has(edge.to)))
        return h('svg', { viewBox: '0 0 640 420' },
          h('rect', { x: 0, y: 0, width: 640, height: 420, fill: '#141a28' }),
          ...inner.map((edge, index) => {
            const from = positions.get(edge.from)
            const to = positions.get(edge.to)
            const active = file && (edge.from === file || edge.to === file)
            return h('line', { key: 'ie' + index, x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: active ? '#7fdc9a' : '#3a4a6a', strokeWidth: active ? 1.6 : 1, opacity: 0.8 })
          }),
          ...items.map((item) => {
            const position = positions.get(item.path)
            const isSelected = file === item.path
            return h('g', { key: item.path, style: { cursor: 'pointer' }, onClick: () => setFile(item.path) },
              h('circle', { cx: position.x, cy: position.y, r: isSelected ? 8 : 6, fill: colorOf(dir), stroke: isSelected ? '#fff' : '#0b1220', strokeWidth: 1 }),
              h('text', { x: position.x + 10, y: position.y + 3, fill: '#c9d6ea', fontSize: 8 }, item.path.split('/').pop().slice(0, 18)))
          }),
          h('text', { x: 20, y: 400, fill: '#8b98ad', fontSize: 9 }, `внутри группы связей: ${inner.length} · наружу: ${outer.length}`))
      }

      const selectedFile = file ? files.find((item) => item.path === file) : null
      const segment = group ? filesView(group) : groupsView()

      return h('div', { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, 'Схема проекта'),
            h('div', { className: 'dept-sub' }, blueprint ? `файлов: ${blueprint.stats.files} · строк: ${blueprint.stats.loc} · связей: ${edges.length}` : (loading ? 'загрузка…' : '—'))),
          h('div', { className: 'dept-row' },
            roots.length > 1
              ? h('select', { className: 'dept-input', value: root, onChange: (event) => setRoot(event.target.value) },
                  ...roots.map((candidate) => h('option', { key: candidate, value: candidate }, candidate.split('/').pop())))
              : null,
            h('button', { className: 'dept-btn' + (mode === 'dir' ? ' active' : ''), onClick: () => { setMode('dir'); setGroup(null); setFile(null) } }, 'По папкам'),
            h('button', { className: 'dept-btn' + (mode === 'layer' ? ' active' : ''), onClick: () => { setMode('layer'); setGroup(null); setFile(null) } }, 'По слоям'),
            group ? h('button', { className: 'dept-btn', onClick: () => { setGroup(null); setFile(null) } }, '← Все группы') : null)),
        error ? h('div', { className: 'dept-badge fail' }, error) : null,
        h('div', { style: { display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr) 300px', gap: '12px', alignItems: 'start' } },
          h('div', { className: 'dept-block', style: { maxHeight: '460px', overflow: 'auto' } },
            h('div', { className: 'dept-block-title' }, 'Группы'),
            ...groupList.map((item) =>
              h('div', {
                key: item.dir,
                className: 'dept-kv',
                style: { cursor: 'pointer', background: group === item.dir ? '#1b2438' : undefined },
                onClick: () => { setGroup(item.dir); setFile(null) },
              },
                h('span', null, groupName(item.dir)),
                h('span', { className: 'dept-sub' }, `${item.files.length}`)))),
          h('div', { className: 'dept-block', style: { padding: 0, overflow: 'hidden' } }, segment),
          h('div', { className: 'dept-block' },
            selectedFile
              ? [
                  h('div', { className: 'dept-block-title' }, selectedFile.path.split('/').pop()),
                  h('div', { className: 'dept-sub' }, selectedFile.path),
                  h('div', { className: 'dept-kv' }, h('span', null, 'строк'), h('span', null, selectedFile.loc)),
                  h('div', { className: 'dept-kv' }, h('span', null, 'слой'), h('span', null, LAYER_TITLES[selectedFile.layer] ?? selectedFile.layer)),
                  h('div', { className: 'dept-block-title' }, 'Функции и классы'),
                  (selectedFile.symbols ?? []).length === 0
                    ? h('div', { className: 'dept-sub' }, '—')
                    : h('div', { className: 'dept-events', style: { maxHeight: '180px', overflow: 'auto' } },
                        ...(selectedFile.symbols ?? []).map((symbol) =>
                          h('div', { key: symbol.name + symbol.line, className: 'dept-event' },
                            h('span', { className: 'dept-sub', style: { minWidth: '34px' } }, symbol.line),
                            h('span', null, symbol.name)))),
                  h('div', { className: 'dept-block-title' }, 'Импортирует'),
                  selectedFile.imports.length === 0 ? h('div', { className: 'dept-sub' }, '—') : h('div', { className: 'dept-events' },
                    ...selectedFile.imports.map((target) => h('div', { key: target, className: 'dept-event' }, h('span', null, target)))),
                  h('div', { className: 'dept-block-title' }, 'Используется в'),
                  (() => {
                    const dependents = edges.filter((edge) => edge.to === selectedFile.path).map((edge) => edge.from)
                    return dependents.length === 0 ? h('div', { className: 'dept-sub' }, '—') : h('div', { className: 'dept-events' },
                      ...dependents.map((source) => h('div', { key: source, className: 'dept-event' }, h('span', null, source))))
                  })(),
                ]
              : h('div', { className: 'dept-sub' }, 'Выбери группу слева, затем файл на схеме.')),
        ),
      )
    }

    /* ---------------- Графики ---------------- */

    function ChartsView({ tasks }) {
      const [current, setCurrent] = useState(tasks[0] ?? null)
      const [detail, setDetail] = useState(null)
      const [error, setError] = useState(null)

      useEffect(() => {
        if (!current) return
        api(ROUTES.task + '?root=' + encodeURIComponent(current.root) + '&taskId=' + encodeURIComponent(current.taskId))
          .then((payload) => { setDetail(payload); setError(null) })
          .catch((problem) => setError(problem.message))
      }, [current?.root, current?.taskId])

      if (!current) return h('div', { className: 'dept-root' }, h('div', { className: 'dept-empty' }, 'Нет задач.'))

      const history = detail?.history ?? []
      const totalTokens = history.reduce((sum, item) => sum + item.tokens, 0)
      const totalCost = history.reduce((sum, item) => sum + item.costUSD, 0)
      const totalMs = history.reduce((sum, item) => sum + item.durationMs, 0)
      const maxTokens = Math.max(1, ...history.map((item) => item.tokens))
      const maxCost = Math.max(0.0001, ...history.map((item) => item.costUSD))
      const maxMs = Math.max(1, ...history.map((item) => item.durationMs))
      const hours = Math.floor(totalMs / 3600000)
      const minutes = Math.round((totalMs % 3600000) / 60000)

      const rows = (items, max, format) => h('div', { className: 'dept-events' }, ...items.map((item) =>
        h('div', { key: item.stage, className: 'dept-event', style: { alignItems: 'center' } },
          h('span', { style: { minWidth: '64px' } }, 'этап ' + item.stage),
          h('div', { style: { flex: '1 1 auto', height: '10px', background: '#1b2438', borderRadius: '6px', overflow: 'hidden' } },
            h('div', { style: { width: Math.max(2, Math.round((item.value / max) * 100)) + '%', height: '100%', background: item.color } })),
          h('span', { className: 'dept-sub', style: { minWidth: '84px', textAlign: 'right' } }, format(item)))))

      return h('div', { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, 'Графики по этапам'),
            h('div', { className: 'dept-sub' }, 'токенов: ' + totalTokens.toLocaleString('ru-RU') + ' · $' + totalCost.toFixed(2) + ' · время: ' + hours + ' ч ' + minutes + ' мин')),
          tasks.length > 1
            ? h('select', { className: 'dept-input', value: current.taskId, onChange: (event) => setCurrent(tasks.find((task) => task.taskId === event.target.value) ?? tasks[0]) },
                ...tasks.map((task) => h('option', { key: task.root + task.taskId, value: task.taskId }, task.taskId)))
            : null),
        error ? h('div', { className: 'dept-badge fail' }, error) : null,
        history.length === 0
          ? h('div', { className: 'dept-block' }, h('div', { className: 'dept-sub' }, 'Этапов ещё нет — графики появятся после первых коммитов.'))
          : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' } },
              h('div', { className: 'dept-block' },
                h('div', { className: 'dept-block-title' }, 'Токены'),
                rows(history.map((item) => ({ ...item, value: item.tokens, color: '#4b8bff' })), maxTokens, (item) => item.tokens.toLocaleString('ru-RU'))),
              h('div', { className: 'dept-block' },
                h('div', { className: 'dept-block-title' }, 'Стоимость'),
                rows(history.map((item) => ({ ...item, value: item.costUSD, color: '#7fdc9a' })), maxCost, (item) => '$' + item.costUSD.toFixed(3))),
              h('div', { className: 'dept-block' },
                h('div', { className: 'dept-block-title' }, 'Длительность'),
                rows(history.map((item) => ({ ...item, value: item.durationMs, color: '#d8c07a' })), maxMs, (item) => Math.round(item.durationMs / 60000) + ' мин'))),
        h('div', { className: 'dept-block' },
          h('div', { className: 'dept-block-title' }, 'Гейты по этапам'),
          ...history.map((item) =>
            h('div', { key: item.stage, className: 'dept-kv' },
              h('span', null, 'этап ' + item.stage),
              h('span', { className: 'dept-row' },
                h('span', { className: 'dept-badge ' + (item.tests === 'pass' ? 'ok' : item.tests === 'fail' ? 'fail' : 'wait') }, 'тесты: ' + item.tests),
                h('span', { className: 'dept-badge ' + (item.review === 'pass' ? 'ok' : item.review === 'fail' ? 'fail' : 'wait') }, 'ревью: ' + item.review))))))
    }

    /* ---------------- Проекты ---------------- */

    function ProjectsView({ onOpen }) {
      const [projects, setProjects] = useState([])
      const [error, setError] = useState(null)
      const [loading, setLoading] = useState(false)

      async function load() {
        setLoading(true)
        try {
          const payload = await api(ROUTES.projects)
          setProjects(payload.projects ?? [])
          setError(null)
        } catch (problem) {
          setError(problem.message)
        } finally {
          setLoading(false)
        }
      }

      useEffect(() => { load() }, [])

      return h('div', { className: 'dept-root' },
        h('div', { className: 'dept-head' },
          h('div', null,
            h('div', { className: 'dept-title' }, 'Проекты'),
            h('div', { className: 'dept-sub' }, `проектов: ${projects.length}${loading ? ' · обновление…' : ''}`)),
          h('button', { className: 'dept-btn', onClick: load }, 'Обновить')),
        error ? h('div', { className: 'dept-badge fail' }, error) : null,
        projects.length === 0 && !loading
          ? h('div', { className: 'dept-empty' }, 'Проектов с задачами нет.')
          : h('div', { className: 'dept-list' }, ...projects.map((project) =>
              h('div', { key: project.root, className: 'dept-card', onClick: () => onOpen(project.root) },
                h('div', { className: 'dept-row' }, h('strong', null, project.name), h('span', { className: 'dept-sub' }, project.root)),
                h('div', { className: 'dept-row' },
                  h('span', { className: 'dept-badge' }, `задач: ${project.taskCount}`),
                  h('span', { className: 'dept-badge ' + (project.active > 0 ? 'ok' : 'wait') }, `в работе: ${project.active}`),
                  h('span', { className: 'dept-sub' }, `токены: ${project.budgetUsed.toLocaleString('ru-RU')}`)),
                h('div', { className: 'dept-sub' }, Object.entries(project.stages).map(([stage, count]) => `${stage}: ${count}`).join(' · ')),
                project.lastEvent ? h('div', { className: 'dept-sub' }, `${project.lastEvent.action} · ${project.lastEvent.detail ?? ''}`) : null))) )
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
      const [projectFilter, setProjectFilter] = useState(null)
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
          ? h(TaskDetail, { detail, onBack: () => { setSelected(null); setDetail(null) }, onReload: () => { if (selected) openTask(selected) } })
          : h('div', { className: 'dept-root' }, h('div', { className: 'dept-empty' }, 'Загрузка задачи…'))
      }

      if (view === 'projects') {
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', { className: 'dept-tabs' },
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, 'Доска'),
              h('button', { className: 'dept-btn active' }, 'Проекты'),
              h('button', { className: 'dept-btn', onClick: () => setView('office') }, 'Офис'),
              h('button', { className: 'dept-btn', onClick: () => setView('blueprint') }, 'Схема'),
              h('button', { className: 'dept-btn', onClick: () => setView('charts') }, 'Графики'))),
          h(ProjectsView, { onOpen: (root) => { setProjectFilter(root); setView('board') } }))
      }

      if (view === 'charts') {
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', { className: 'dept-tabs' },
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, 'Доска'),
              h('button', { className: 'dept-btn', onClick: () => setView('office') }, 'Офис'),
              h('button', { className: 'dept-btn', onClick: () => setView('blueprint') }, 'Схема'),
              h('button', { className: 'dept-btn active' }, 'Графики')),
            h('button', { className: 'dept-btn', onClick: loadTasks }, 'Обновить')),
          h(ChartsView, { tasks }))
      }

      if (view === 'blueprint') {
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', { className: 'dept-tabs' },
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, 'Доска'),
              h('button', { className: 'dept-btn', onClick: () => setView('office') }, 'Офис'),
              h('button', { className: 'dept-btn active' }, 'Схема')),
            h('button', { className: 'dept-btn', onClick: loadTasks }, 'Обновить')),
          h(BlueprintView, { tasks }))
      }

      if (view === 'office') {
        return h('div', { className: 'dept-root' },
          h('div', { className: 'dept-head' },
            h('div', { className: 'dept-tabs' },
              h('button', { className: 'dept-btn', onClick: () => setView('board') }, 'Доска'),
              h('button', { className: 'dept-btn active', onClick: () => setView('office') }, 'Офис'),
              h('button', { className: 'dept-btn', onClick: () => setView('blueprint') }, 'Схема'),
              h('button', { className: 'dept-btn', onClick: () => setView('charts') }, 'Графики')),
            h('button', { className: 'dept-btn', onClick: loadTasks }, 'Обновить')),
          h(OfficeView, { items: activity.items, selected: selectedSession, onSelect: setSelectedSession, tasks, onOpenTask: (root) => { const task = tasks.find((candidate) => candidate.root === root); if (task) openTask(task) } }),
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
            h('button', { className: 'dept-btn', onClick: () => setView('projects') }, 'Проекты'),
            h('button', { className: 'dept-btn', onClick: () => setView('office') }, 'Офис'),
            h('button', { className: 'dept-btn', onClick: () => setView('blueprint') }, 'Схема'),
            h('button', { className: 'dept-btn', onClick: () => setView('charts') }, 'Графики'),
            h('button', { className: 'dept-btn', onClick: loadTasks }, 'Обновить')),
        ),
        h(ActivityBlock, { items: activity.items, error: activity.error }),
        error ? h('div', { className: 'dept-badge fail' }, error) : null,
        projectFilter ? h('div', { className: 'dept-row' }, h('span', { className: 'dept-badge' }, 'проект: ' + projectFilter.split('/').pop()), h('button', { className: 'dept-btn', onClick: () => setProjectFilter(null) }, 'Сбросить')) : null,
        (projectFilter ? tasks.filter((task) => task.root === projectFilter) : tasks).length === 0 && !loading
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

    return { PANEL_ID, apply, inject, styleOnce, DepartmentPanel, TaskDetail, BlueprintView, OfficeView, ChartsView }
  },
})
