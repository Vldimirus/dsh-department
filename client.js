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
      { key: 'coder', x: 90, y: 180, label: 'Кодер' },
      { key: 'manager', x: 210, y: 180, label: 'Руководитель' },
      { key: 'reviewer', x: 330, y: 180, label: 'Ревьюер' },
      { key: 'analyst', x: 90, y: 268, label: 'Аналитик' },
      { key: 'tester', x: 210, y: 268, label: 'Тестер' },
      { key: 'archivist', x: 330, y: 268, label: 'Архивариус' },
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

    const ATLAS_URL = '/api/department/asset?name=office-atlas.png'
    const ATLAS_W = 256
    const ATLAS_H = 60

    function spriteBox(name, x, y, scale) {
      const sp = SPRITES[name]
      if (!sp) return null
      const size = scale ?? 2
      return h('svg', {
        x, y, width: sp.w * size, height: sp.h * size,
        viewBox: sp.x + ' ' + sp.y + ' ' + sp.w + ' ' + sp.h,
        preserveAspectRatio: 'none',
        style: { imageRendering: 'pixelated' },
      }, h('image', { href: ATLAS_URL, x: 0, y: 0, width: ATLAS_W, height: ATLAS_H }))
    }

    function zoneOfPoint(point) {
      return point.x < 404 ? 'open' : 'break'
    }

    function routeTo(from, to) {
      const door = [{ x: 436, y: 188 }, { x: 404, y: 188 }, { x: 372, y: 188 }]
      if (zoneOfPoint(from) === zoneOfPoint(to)) return [to]
      const pass = zoneOfPoint(from) === 'break' ? door : [...door].reverse()
      return [...pass, to]
    }

    function routeLength(from, points) {
      let total = 0
      let previous = from
      for (const point of points) { total += Math.hypot(point.x - previous.x, point.y - previous.y); previous = point }
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

    const SPRITES = {"floor":{"x":2,"y":2,"w":16,"h":16},"wall":{"x":20,"y":2,"w":16,"h":16},"desk":{"x":38,"y":2,"w":33,"h":12},"chair":{"x":73,"y":2,"w":10,"h":11},"monitor":{"x":85,"y":2,"w":16,"h":10},"plant":{"x":103,"y":2,"w":16,"h":15},"plant2":{"x":121,"y":2,"w":16,"h":14},"cactus":{"x":139,"y":2,"w":16,"h":12},"flower":{"x":157,"y":2,"w":16,"h":13},"cooler":{"x":175,"y":2,"w":12,"h":14},"coffee":{"x":189,"y":2,"w":12,"h":11},"sofa":{"x":203,"y":2,"w":32,"h":10},"table":{"x":2,"y":20,"w":22,"h":8},"books":{"x":26,"y":20,"w":8,"h":6},"papers":{"x":36,"y":20,"w":9,"h":7},"mug":{"x":47,"y":20,"w":6,"h":5},"lamp":{"x":55,"y":20,"w":8,"h":8},"bin":{"x":65,"y":20,"w":8,"h":5},"board":{"x":75,"y":20,"w":21,"h":7},"window":{"x":98,"y":20,"w":16,"h":7},"door":{"x":116,"y":20,"w":8,"h":9},"rug":{"x":126,"y":20,"w":16,"h":5},"server":{"x":144,"y":20,"w":16,"h":7},"printer":{"x":162,"y":20,"w":16,"h":7},"clock":{"x":180,"y":20,"w":7,"h":6},"laptop":{"x":189,"y":20,"w":12,"h":6},"shelf":{"x":203,"y":20,"w":8,"h":8},"kettle":{"x":213,"y":20,"w":8,"h":7},"manager_stand":{"x":223,"y":20,"w":10,"h":18},"manager_sit":{"x":235,"y":20,"w":10,"h":15},"coder_stand":{"x":2,"y":40,"w":10,"h":18},"coder_sit":{"x":14,"y":40,"w":10,"h":15},"reviewer_stand":{"x":26,"y":40,"w":10,"h":18},"reviewer_sit":{"x":38,"y":40,"w":10,"h":15},"tester_stand":{"x":50,"y":40,"w":10,"h":18},"tester_sit":{"x":62,"y":40,"w":10,"h":15},"analyst_stand":{"x":74,"y":40,"w":10,"h":18},"analyst_sit":{"x":86,"y":40,"w":10,"h":15},"archivist_stand":{"x":98,"y":40,"w":10,"h":18},"archivist_sit":{"x":110,"y":40,"w":10,"h":15},"instrumenter_stand":{"x":122,"y":40,"w":10,"h":18},"instrumenter_sit":{"x":134,"y":40,"w":10,"h":15}}

    function OfficeView({ items, selected, onSelect }) {
      const assignments = React.useRef(null)
      if (!assignments.current) assignments.current = new Map()
      const settled = React.useRef(new Map())
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
      const chairSeats = [{ x: 456, y: 214 }, { x: 520, y: 214 }, { x: 584, y: 214 }, { x: 520, y: 254 }]
      const coolerSpot = { x: 588, y: 250 }
      const windowSpot = { x: 438, y: 74 }
      const loungeTargets = [...chairSeats.map((seat, index) => ({ kind: 'seat', spot: seat, index })), { kind: 'cooler', spot: coolerSpot }, { kind: 'window', spot: windowSpot }]
      const time = Date.now()

      const box = (x, y, width, height, fill, extra) => h('rect', Object.assign({ x, y, width, height, fill }, extra ?? {}))
      const wall = (x, y, width, height) => h('g', null,
        box(x, y, width, height, '#3a4560'),
        box(x, y, width, 3, '#5b6a90'),
        box(x, y + height - 3, width, 3, '#232c42'))

      const personAt = (role, entry, x, y, sitting) => h('g', {
        key: (sitting ? 'sit-' : 'stand-') + entry.sessionId,
        onClick: () => onSelect(entry.sessionId),
        style: { cursor: 'pointer', filter: selected === entry.sessionId ? 'drop-shadow(0 0 4px #6fb2ff)' : undefined },
      }, spriteBox(role + (sitting ? '_sit' : '_stand'), x - 10, y - (sitting ? 30 : 36), 2))

      const walkingPerson = (role, entry, spot) => h('g', {
        key: 'walk-' + entry.sessionId,
        onClick: () => onSelect(entry.sessionId),
        style: {
          transform: 'translate(' + spot.x + 'px,' + spot.y + 'px)',
          transition: 'transform .34s linear',
          cursor: 'pointer',
          filter: selected === entry.sessionId ? 'drop-shadow(0 0 4px #6fb2ff)' : undefined,
        },
      },
        h('ellipse', { cx: 0, cy: 2, rx: 8, ry: 3, fill: '#00000022' }),
        h('g', { transform: 'translate(-10,-36)' }, spriteBox(role + '_stand', 0, 0, 2)))

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
            actors.push({ entry, role, mode: plan.target.kind, spot: plan.target.spot, index: plan.target.index ?? current.index, desk })
          } else {
            actors.push({ entry, role, mode: 'walk', spot: position, index: current.index, desk })
          }
        } else {
          const moved = current.mode !== target.kind || Math.hypot(current.x - target.spot.x, current.y - target.spot.y) > 2
          if (moved) {
            const points = routeTo({ x: current.x, y: current.y }, target.spot)
            const duration = Math.min(22000, Math.max(6000, routeLength({ x: current.x, y: current.y }, points) * 95))
            plans.current.set(id, { from: { x: current.x, y: current.y }, points, start: time, duration, target })
            actors.push({ entry, role, mode: 'walk', spot: current, index: current.index, desk })
          } else {
            actors.push({ entry, role, mode: current.mode, spot: { x: current.x, y: current.y }, index: current.index, desk })
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
                h('pattern', { id: 'dept-floor', width: 32, height: 32, patternUnits: 'userSpaceOnUse' },
                  box(0, 0, 32, 32, '#d9c9a3'),
                  box(0, 0, 32, 2, '#cbb98f'),
                  box(0, 0, 2, 32, '#cbb98f'))),
              box(0, 0, 640, 400, '#1e2536'),
              box(8, 8, 624, 384, 'url(#dept-floor)'),
              wall(0, 0, 640, 24), wall(0, 0, 12, 400), wall(628, 0, 12, 400), wall(0, 388, 640, 12),
              spriteBox('window', 30, 2, 2), spriteBox('window', 150, 2, 2), spriteBox('window', 270, 2, 2), spriteBox('window', 470, 2, 2),
              wall(404, 24, 8, 150), spriteBox('door', 402, 176, 2), wall(404, 210, 8, 100),
              wall(12, 292, 172, 8), spriteBox('door', 186, 290, 2), wall(224, 292, 246, 8), spriteBox('door', 472, 290, 2), wall(510, 292, 118, 8),
              h('text', { x: 22, y: 48, fill: '#8a96ad', fontSize: 9 }, 'OPEN SPACE'),
              h('text', { x: 420, y: 48, fill: '#8a96ad', fontSize: 9 }, 'КОМНАТА ОТДЫХА'),
              spriteBox('rug', 436, 200, 2),
              spriteBox('sofa', 430, 244, 2),
              spriteBox('table', 470, 140, 2),
              spriteBox('board', 500, 44, 2),
              spriteBox('shelf', 430, 60, 2),
              spriteBox('clock', 560, 30, 2),
              spriteBox('coffee', 592, 60, 2),
              spriteBox('cooler', 580, 246, 2),
              spriteBox('plant', 404, 250, 2),
              spriteBox('plant2', 20, 250, 2),
              spriteBox('cactus', 380, 250, 2),
              spriteBox('flower', 24, 40, 2),
              ...DESKS.map((desk) => {
                const entry = byRole.get(desk.key)
                if (!entry) return null
                const actor = actors.find((item) => item.entry.sessionId === entry.sessionId)
                if (!actor || actor.mode !== 'desk') return null
                const role = desk.key
                return personAt(role, entry, desk.x, desk.y - 14, true)
              }),
              ...DESKS.map((desk) => spriteBox('desk', desk.x - 32, desk.y - 14, 2)),
              ...DESKS.map((desk) => spriteBox('monitor', desk.x - 30, desk.y - 36, 2)),
              ...DESKS.map((desk) => spriteBox('chair', desk.x - 10, desk.y + 8, 2)),
              ...actors.map((actor) => {
                if (actor.mode === 'desk') return null
                if (actor.mode === 'walk') return walkingPerson(actor.role, actor.entry, actor.spot)
                return personAt(actor.role, actor.entry, actor.spot.x, actor.spot.y, actor.mode === 'seat')
              }),
              ...DESKS.map((desk) => {
                const entry = byRole.get(desk.key)
                const actor = entry ? actors.find((item) => item.entry.sessionId === entry.sessionId) : null
                const atDesk = actor?.mode === 'desk'
                return h('text', { key: 'label-' + desk.key, x: desk.x - 2, y: desk.y + 34, fill: atDesk ? '#9fd0ff' : '#6f7f98', fontSize: 8, textAnchor: 'middle' },
                  desk.label + (entry ? (atDesk ? ' · работает' : entry.busy ? ' · идёт' : ' · перерыв') : ' · свободно'))
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
                  (selectedEntry.recent ?? []).length === 0 ? h('div', { className: 'dept-sub' }, 'пока нет')
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
