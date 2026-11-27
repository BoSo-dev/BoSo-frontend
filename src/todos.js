;(function (global) {
  'use strict'
  const f = global.BoSo.features
  const statuses = ['pending', 'completed', 'archived', 'all']
  const id = (number) => `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`
  function item(value) {
    if (!value || !['id', 'policy_id', 'policy_version_id', 'action_id'].every((name) => f.uuid(value[name])) || !f.text(value.action_key) || !f.text(value.title, 200) || !f.text(value.description) || !statuses.slice(0, 3).includes(value.status) || !(value.due_date === null || f.date(value.due_date)) || typeof value.is_overdue !== 'boolean' || !(value.completed_at === null || f.time(value.completed_at)) || !f.time(value.created_at) || !f.time(value.updated_at) || !(value.archived_reason === null || f.text(value.archived_reason))) throw f.invalid()
    if (value.demo_steps !== undefined && (!Array.isArray(value.demo_steps) || value.demo_steps.length > 10 || value.demo_steps.some((step) => !f.text(step.label, 200) || typeof step.done !== 'boolean'))) throw f.invalid()
    return value
  }
  function seed() {
    const names = ['청년 혜택 자격 다시 인증하기', '거주지 정보 업데이트하기', '교통비 지원 신청 절차 확인하기']
    return names.map((title, index) => item({ id: id(index + 1), policy_id: id(10), policy_version_id: id(11), action_id: id(20 + index), action_key: `demo-${index}`, title: `[시연] ${title}`, description: '실제 신청이나 자격 판정이 아닌 절차 확인 예시입니다. 공식 정책의 조건과 적용 범위를 먼저 확인해 주세요.', due_date: index === 2 ? '2026-10-01' : '2026-12-31', status: 'pending', archived_reason: null, completed_at: null, created_at: '2026-11-28T00:00:00Z', updated_at: '2026-11-28T00:00:00Z', is_overdue: false, demo_policy_key: 'demo-k-pass', demo_steps: ['공식 안내 확인하기', '로그인하고 필요한 정보 확인하기', '안내에 따라 절차 확인하기', '확인 결과 기록하기'].map((label) => ({ label, done: false })) }))
  }
  function rows(values) { if (!Array.isArray(values) || values.length > 1000) throw f.invalid(); values.forEach(item); return values }
  function createTodos(context) {
    const { services } = context
    const owned = f.owned({ ...context, namespace: 'todos', seed, validate: rows })
    const demo = services.mode === 'demo'
    return Object.freeze({
      get persistent() { return owned.persistent },
      async list({ status = 'pending', offset = 0 } = {}, options = {}) {
        const state = owned.owner()
        if (!statuses.includes(status) || !f.count(offset)) throw f.fail('INVALID_INPUT', '잘못된 목록 조건')
        if (demo) {
          const all = owned.local(state).map((row) => ({ ...row, is_overdue: row.status === 'pending' && Boolean(row.due_date && row.due_date < f.today()) }))
          const filtered = all.filter((row) => status === 'all' || row.status === status)
          return { items: filtered.slice(offset, offset + 20), total: filtered.length, limit: 20, offset }
        }
        const page = await owned.request(state, `/api/v1/todos?status=${status}&limit=20&offset=${offset}`, options)
        if (!page || !f.count(page.total) || !f.count(page.offset) || page.offset !== offset || page.limit !== 20) throw f.invalid()
        rows(page.items); if (page.items.length > 20 || page.total < page.items.length) throw f.invalid()
        return page
      },
      async summary(options = {}) {
        const state = owned.owner()
        if (demo) {
          const all = owned.local(state)
          return { pending: all.filter((r) => r.status === 'pending').length, completed: all.filter((r) => r.status === 'completed').length, archived: all.filter((r) => r.status === 'archived').length, overdue: all.filter((r) => r.status === 'pending' && r.due_date && r.due_date < f.today()).length }
        }
        const value = await owned.request(state, '/api/v1/todos/summary', options)
        if (!value || !['pending', 'completed', 'archived', 'overdue'].every((key) => f.count(value[key]))) throw f.invalid()
        return value
      },
      async detail(todoId, options = {}) {
        const state = owned.owner()
        if (!f.uuid(todoId)) throw f.fail('TODO_NOT_FOUND', '할 일을 찾을 수 없습니다.', 404)
        if (!demo) return item(await owned.request(state, `/api/v1/todos/${todoId}`, options))
        const found = owned.local(state).find((row) => row.id === todoId)
        if (!found) throw f.fail('TODO_NOT_FOUND', '할 일을 찾을 수 없습니다.', 404)
        return { ...found, is_overdue: found.status === 'pending' && Boolean(found.due_date && found.due_date < f.today()) }
      },
      async complete(todoId, completed, options = {}) {
        const state = owned.owner()
        if (!f.uuid(todoId) || typeof completed !== 'boolean') throw f.fail('INVALID_INPUT', '잘못된 완료 요청')
        if (!demo) return item(await owned.request(state, `/api/v1/todos/${todoId}`, { ...options, method: 'PATCH', json: { completed } }))
        const values = owned.local(state), row = values.find((value) => value.id === todoId)
        if (!row) throw f.fail('TODO_NOT_FOUND', '할 일을 찾을 수 없습니다.', 404)
        if (row.status === 'archived') throw f.fail('TODO_NOT_ACTIVE', '보관된 할 일', 409)
        row.status = completed ? 'completed' : 'pending'; row.completed_at = completed ? new Date().toISOString() : null; row.updated_at = new Date().toISOString()
        owned.save(state, values)
        return f.copy(row)
      },
      async step(todoId, index, done) {
        const state = owned.owner()
        if (!demo) throw f.fail('INVALID_INPUT', '세부 체크는 시연 전용입니다.')
        const values = owned.local(state), row = values.find((value) => value.id === todoId)
        if (!row || row.status !== 'pending' || !f.count(index) || !row.demo_steps?.[index] || typeof done !== 'boolean') throw f.fail('INVALID_INPUT', '잘못된 체크 요청')
        row.demo_steps[index].done = done; owned.save(state, values); return f.copy(row)
      },
      async sync(options = {}) {
        const state = owned.owner()
        if (demo) { owned.local(state); return { created: 0, updated: 0, archived: 0, assessments: [] } }
        const value = await owned.request(state, '/api/v1/todos/sync', { ...options, method: 'POST', json: {} })
        if (!value || !['created', 'updated', 'archived'].every((key) => f.count(value[key])) || !Array.isArray(value.assessments)) throw f.invalid()
        return value
      },
    })
  }
  function mountTodos(main, context) {
    const { todos, services } = context
    const page = f.scope(main, context, '내가 해야 할 일을 확인해보세요', '내 조건과 정책에 맞는 확인 목록을 살펴봐요.', true)
    const params = new URLSearchParams(global.location.hash.split('?')[1] || '')
    const todoId = params.get('id'), status = params.get('status') || 'pending'
    const offset = Number(params.get('offset') || 0)
    const body = f.el('div'), tools = f.el('div', { class: 'feature-toolbar' })
    page.root.append(tools, body)
    let busy = false
    const back = `#/todos?status=${statuses.includes(status) ? status : 'pending'}&offset=${f.count(offset) ? offset : 0}`
    const retry = f.button('다시 불러오기', () => { void load() }, 'secondary')
    async function change(idValue, checked, onFailure = () => {}) {
      if (busy) return
      busy = true
      try { await todos.complete(idValue, checked, { signal: page.signal() }); if (page.alive() && await load()) page.message('완료 상태를 저장했습니다.') }
      catch (problem) { page.message(f.message(problem), true); if (page.alive()) { onFailure(); body.prepend(retry) } }
      finally { busy = false }
    }
    function detail(row) {
      tools.replaceChildren(f.link('To-Do 목록', back, 'secondary'))
      const panel = f.el('section', { class: 'card feature-panel' }, f.el('span', { class: 'badge badge--warm' }, row.status === 'completed' ? '완료' : row.status === 'archived' ? '보관' : '확인할 일'), f.el('h2', {}, row.title), f.el('p', {}, row.description), f.el('p', { class: 'field-help' }, `마감일: ${row.due_date || '정해지지 않음'}${row.is_overdue ? ' · 마감 초과' : ''}`))
      if (row.demo_steps) {
        panel.append(f.el('h3', {}, '이렇게 확인해 주세요'), f.el('p', { class: 'field-help' }, '시연용 단계 체크입니다. 전체 완료는 아래 버튼으로 기록합니다.'))
        row.demo_steps.forEach((step, index) => {
          const input = f.el('input', { type: 'checkbox', checked: step.done, disabled: row.status !== 'pending' })
          input.addEventListener('change', async () => {
            input.disabled = true
            try { await todos.step(row.id, index, input.checked); page.message('시연 확인 단계를 저장했습니다.') } catch (problem) { input.checked = !input.checked; page.message(f.message(problem), true) } finally { if (page.alive()) input.disabled = false }
          })
          panel.append(f.el('label', { class: 'profile-choice' }, input, step.label))
        })
      }
      if (row.archived_reason) panel.append(f.el('p', {}, '보관 사유: ' + row.archived_reason))
      if (row.completed_at) panel.append(f.el('p', { class: 'field-help' }, '완료 기록: ' + new Date(row.completed_at).toLocaleString('ko-KR')))
      const actions = f.el('div', { class: 'profile-actions' })
      if (row.status !== 'archived') actions.append(f.button(row.status === 'completed' ? '완료 취소' : '완료했어요', () => { void change(row.id, row.status !== 'completed') }))
      if (services.mode === 'demo') actions.append(f.link('관련 정책 예시', '#/policies?id=' + encodeURIComponent(row.demo_policy_key || 'demo-k-pass')))
      else panel.append(f.el('p', { class: 'field-help' }, '관련 정책 상세 안내는 준비 중입니다.'))
      panel.append(actions); body.replaceChildren(panel)
    }
    async function load() {
      page.message('할 일을 불러오고 있어요.')
      try {
        if (todoId) { const row = await todos.detail(todoId, { signal: page.signal() }); if (page.alive()) detail(row) }
        else {
          const [list, summary] = await Promise.all([todos.list({ status, offset }, { signal: page.signal() }), todos.summary({ signal: page.signal() })])
          if (!page.alive()) return
          tools.replaceChildren()
          for (const [value, label] of [['pending', '진행 중'], ['completed', '완료'], ['archived', '보관'], ['all', '전체']]) tools.append(f.link(`${label}${value === 'all' ? '' : ' ' + summary[value]}`, '#/todos?status=' + value, value === status ? 'primary' : 'subtle'))
          const progress = summary.pending + summary.completed
          body.replaceChildren(f.el('p', { class: 'field-help' }, `완료 ${summary.completed}/${progress} · 마감 초과 ${summary.overdue}개`), f.el('progress', { value: summary.completed, max: progress || 1, 'aria-label': '할 일 완료 현황' }))
          const listPanel = f.el('section', { class: 'card feature-panel', 'aria-label': 'To-Do 목록' })
          if (!list.items.length) listPanel.append(f.el('p', {}, '해당 상태의 할 일이 없습니다. 내 정보를 저장한 뒤 할 일 다시 확인을 눌러 주세요.'))
          for (const row of list.items) {
            const input = f.el('input', { type: 'checkbox', checked: row.status === 'completed', disabled: row.status === 'archived', 'aria-label': row.title + ' 완료 상태' })
            input.addEventListener('change', () => {
              if (busy) { input.checked = row.status === 'completed'; return }
              input.disabled = true
              void change(row.id, input.checked, () => { input.checked = row.status === 'completed'; input.disabled = false })
            })
            listPanel.append(f.el('div', { class: 'todo-row' }, input, f.el('div', {}, f.el('a', { href: `#/todos?id=${encodeURIComponent(row.id)}&status=${encodeURIComponent(status)}&offset=${offset}` }, row.title), f.el('p', { class: 'field-help' }, `마감일: ${row.due_date || '없음'}${row.is_overdue ? ' · 마감 초과' : ''}`))))
          }
          body.append(listPanel)
          const pagination = f.el('nav', { class: 'feature-toolbar', 'aria-label': '할 일 페이지' })
          if (offset > 0) pagination.append(f.link('이전', `#/todos?status=${status}&offset=${Math.max(0, offset - 20)}`))
          if (offset + list.items.length < list.total) pagination.append(f.link('다음', `#/todos?status=${status}&offset=${offset + 20}`))
          body.append(pagination)
          tools.append(f.button('할 일 다시 확인', async () => {
            if (busy) return
            busy = true
            try { const result = await todos.sync({ signal: page.signal() }); if (await load()) page.message(services.mode === 'demo' ? '시연 목록입니다. 실제 자격 판정이나 할 일 생성은 하지 않았습니다.' : `다시 확인했습니다. 생성 ${result.created}, 갱신 ${result.updated}, 보관 ${result.archived}`) } catch (problem) { page.message(f.message(problem), true) } finally { busy = false }
          }, 'secondary'))
        }
        page.message(services.mode === 'demo' ? '시연용 할 일입니다. 실제 신청은 진행하지 않습니다.' : '할 일을 확인하고 상태를 기록할 수 있어요.')
        return true
      } catch (problem) { if (page.alive()) { page.message(f.message(problem), true); body.replaceChildren(retry, f.link('목록으로', '#/todos')) }; return false }
    }
    const start = global.setTimeout(() => { void load() }, 0)
    return () => { global.clearTimeout(start); page.dispose() }
  }
  function mountTodoHome(main, context) {
    const label = main.querySelector('.home-shortcut--pink .eyebrow')
    const state = context.store.getState().auth
    if (state.status !== 'authenticated') { label.textContent = '로그인하고 확인해보세요'; return () => {} }
    const controller = new AbortController()
    let disposed = false
    const start = global.setTimeout(async () => {
      try {
        const summary = await context.todos.summary({ signal: controller.signal })
        if (!disposed && context.store.getState().auth === state) label.textContent = `확인할 일이 ${summary.pending}개 있어요${context.services.mode === 'demo' ? ' · 시연' : ''}`
      } catch { if (!disposed) label.textContent = '확인할 일을 살펴보세요' }
    }, 0)
    return () => { disposed = true; global.clearTimeout(start); controller.abort() }
  }
  Object.assign(global.BoSo, { createTodos, mountTodos, mountTodoHome })
})(globalThis)
