;(function (global) {
  'use strict'
  const f = global.BoSo.features
  const policyKeys = ['demo-k-pass', 'demo-climate-card', 'demo-fare', 'demo-support', 'demo-transit']
  function validate(values) {
    if (!Array.isArray(values) || values.length > 1000 || values.some((row) => !f.uuid(row?.id) || !f.text(row.title, 200) || !f.text(row.message) || !['policy', 'todo'].includes(row.type) || !f.time(row.created_at) || !(row.read_at === null || f.time(row.read_at)) || !row.target || row.target.type !== row.type || (row.type === 'policy' ? !policyKeys.includes(row.target.id) : !f.uuid(row.target.id)))) throw f.invalid()
    return values
  }
  function seed() {
    return validate([
      { id: '30000000-0000-4000-8000-000000000001', type: 'policy', title: '[시연] 정책 안내가 바뀌었어요', message: '정책 변화 예시의 변경 전후를 확인해 주세요. 실제 정책 변경 알림이 아닙니다.', created_at: '2026-11-28T01:00:00Z', read_at: null, target: { type: 'policy', id: 'demo-k-pass' } },
      { id: '30000000-0000-4000-8000-000000000002', type: 'todo', title: '[시연] 확인할 일이 있어요', message: '시연용 할 일의 조건과 마감일을 확인해 주세요. 실제 신청이나 마감 안내가 아닙니다.', created_at: '2026-11-28T00:00:00Z', read_at: null, target: { type: 'todo', id: '10000000-0000-4000-8000-000000000001' } },
    ])
  }
  const targetHref = (row) => row.target.type === 'todo' ? '#/todos?id=' + encodeURIComponent(row.target.id) : '#/policies?id=' + encodeURIComponent(row.target.id)
  function createNotifications(context) {
    const owned = f.owned({ ...context, namespace: 'notifications', seed, validate })
    const listeners = new Set()
    const available = () => { if (context.services.mode !== 'demo') throw f.fail('NOTIFICATION_API_UNAVAILABLE', '알림 HTTP 계약이 준비되지 않았습니다.') }
    const notify = () => { for (const listener of [...listeners]) listener() }
    return Object.freeze({
      get persistent() { return owned.persistent },
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
      async list(filter = 'all', offset = 0) {
        const state = owned.owner(); available()
        if (!['all', 'unread', 'read'].includes(filter) || !f.count(offset)) throw f.fail('INVALID_INPUT', '잘못된 알림 조건')
        const items = owned.local(state).filter((row) => filter === 'all' || (filter === 'read' ? row.read_at !== null : row.read_at === null)).sort((a, b) => b.created_at.localeCompare(a.created_at))
        return { items: items.slice(offset, offset + 20), total: items.length, offset, limit: 20 }
      },
      async summary() {
        const state = owned.owner(); available()
        return { unread: owned.local(state).filter((row) => row.read_at === null).length }
      },
      async read(notificationId) {
        const state = owned.owner(); available()
        const values = owned.local(state), row = values.find((value) => value.id === notificationId)
        if (!row) throw f.fail('INVALID_INPUT', '알림을 찾을 수 없습니다.')
        row.read_at = row.read_at || new Date().toISOString(); owned.save(state, values); notify(); return f.copy(row)
      },
      async readAll() {
        const state = owned.owner(); available()
        const now = new Date().toISOString(), values = owned.local(state)
        for (const row of values) row.read_at = row.read_at || now
        owned.save(state, values); notify()
      },
    })
  }
  function mountNotifications(main, context) {
    const { notifications } = context
    const page = f.scope(main, context, '놓치지 말아야 할 교통 소식', '정책 변경과 확인할 일을 한곳에서 살펴봐요.')
    const params = new URLSearchParams(global.location.hash.split('?')[1] || '')
    const filter = params.get('filter') || 'all', offset = Number(params.get('offset') || 0)
    const tools = f.el('div', { class: 'feature-toolbar' }), body = f.el('section', { class: 'card feature-panel', 'aria-label': '알림 목록' })
    page.root.append(tools, body)
    let busy = false
    async function mark(row, navigate = false) {
      if (busy) return
      busy = true
      try {
        await notifications.read(row.id)
        if (!page.alive()) return
        if (navigate) global.location.hash = targetHref(row)
        else { await load(); page.message('읽음으로 표시했습니다.') }
      } catch (problem) { page.message(f.message(problem), true) } finally { busy = false }
    }
    async function load() {
      page.message('알림을 확인하고 있어요.')
      try {
        const [list, summary] = await Promise.all([notifications.list(filter, offset), notifications.summary()])
        if (!page.alive()) return false
        tools.replaceChildren()
        for (const [value, label] of [['all', '전체'], ['unread', '안 읽음'], ['read', '읽음']]) tools.append(f.link(label, '#/notifications?filter=' + value, filter === value ? 'primary' : 'subtle'))
        tools.append(f.button('모두 읽음', async () => {
          if (busy) return
          busy = true
          try { await notifications.readAll(); if (await load()) page.message('모든 알림을 읽음으로 표시했습니다.') } catch (problem) { page.message(f.message(problem), true) } finally { busy = false }
        }, 'secondary'))
        body.replaceChildren()
        if (!list.items.length) body.append(f.el('p', {}, '해당하는 알림이 없습니다.'))
        for (const row of list.items) {
          const title = f.el('a', { href: targetHref(row) }, row.title)
          title.addEventListener('click', (event) => { event.preventDefault(); void mark(row, true) })
          const panel = f.el('article', { class: 'notification-row' + (row.read_at ? '' : ' notification-row--unread') }, f.el('span', { class: 'badge ' + (row.read_at ? 'badge--neutral' : 'badge--blue') }, row.read_at ? '읽음' : '안 읽음'), f.el('h2', {}, title), f.el('p', {}, row.message), f.el('p', { class: 'field-help' }, new Date(row.created_at).toLocaleString('ko-KR')))
          if (!row.read_at) panel.append(f.button('읽음으로 표시', () => { void mark(row) }, 'secondary'))
          body.append(panel)
        }
        if (offset > 0) body.append(f.link('이전 페이지', `#/notifications?filter=${filter}&offset=${Math.max(0, offset - 20)}`))
        if (offset + list.items.length < list.total) body.append(f.link('다음 페이지', `#/notifications?filter=${filter}&offset=${offset + 20}`))
        page.message(`읽지 않은 알림 ${summary.unread}개 · 시연 알림입니다.`)
        return true
      } catch (problem) {
        if (page.alive()) { body.replaceChildren(f.el('p', {}, f.message(problem))); page.message(f.message(problem), true) }
        return false
      }
    }
    const start = global.setTimeout(() => { void load() }, 0)
    return () => { global.clearTimeout(start); page.dispose() }
  }
  function mountNotificationBadge({ notifications, store }) {
    const link = document.querySelector('.icon-link[data-route="notifications"]')
    const badge = document.getElementById('notification-count')
    let timer
    async function update() {
      global.clearTimeout(timer)
      const captured = store.getState().auth
      if (captured.status !== 'authenticated') { badge.hidden = true; badge.textContent = ''; link.setAttribute('aria-label', '알림'); return }
      timer = global.setTimeout(async () => {
        try {
          const summary = await notifications.summary()
          if (store.getState().auth !== captured) return
          badge.textContent = String(summary.unread); badge.hidden = summary.unread === 0; link.setAttribute('aria-label', `알림, 읽지 않은 알림 ${summary.unread}개`)
        } catch { if (store.getState().auth === captured) { badge.hidden = true; link.setAttribute('aria-label', '알림') } }
      }, 0)
    }
    let previous = store.getState().auth
    const unsubscribeStore = store.subscribe((state) => { if (state.auth !== previous) { previous = state.auth; void update() } })
    const unsubscribeNotifications = notifications.subscribe(() => { void update() })
    void update()
    return () => { global.clearTimeout(timer); unsubscribeStore(); unsubscribeNotifications() }
  }
  Object.assign(global.BoSo, { createNotifications, mountNotifications, mountNotificationBadge })
})(globalThis)
