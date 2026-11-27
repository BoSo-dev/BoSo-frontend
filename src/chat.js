;(function (global) {
  'use strict'
  const f = global.BoSo.features
  function conversation(value) {
    if (!value || !f.uuid(value.id) || !f.text(value.title, 100) || !f.time(value.created_at) || !f.time(value.updated_at)) throw f.invalid()
    return value
  }
  function turn(value) {
    if (!value || !f.uuid(value.id) || !f.uuid(value.request_id) || !Number.isInteger(value.turn_number) || value.turn_number < 1 || !f.text(value.question) || [...value.question].length > 2000 || !f.text(value.answer, 4000) || typeof value.needs_more_info !== 'boolean' || typeof value.external_used !== 'boolean' || !f.time(value.created_at) || !Array.isArray(value.sources) || value.sources.length > 10 || value.sources.some((source) => !f.uuid(source.version_id) || !f.uuid(source.policy_id) || !f.text(source.source_key, 64) || !f.text(source.title) || !global.BoSo.safePolicyUrl(source.url)) || !Array.isArray(value.related_todos) || value.related_todos.some((row) => !f.uuid(row.id) || !f.text(row.title) || !['pending', 'completed', 'archived'].includes(row.status))) throw f.invalid()
    return value
  }
  function validate(value) {
    if (!value || !Array.isArray(value.conversations) || value.conversations.length > 200 || !value.turns || typeof value.turns !== 'object' || Array.isArray(value.turns)) throw f.invalid()
    value.conversations.forEach(conversation)
    for (const [id, items] of Object.entries(value.turns)) {
      if (!f.uuid(id) || !value.conversations.some((row) => row.id === id) || !Array.isArray(items) || items.length > 500) throw f.invalid()
      items.forEach(turn)
    }
    return value
  }
  function createChat(context) {
    const { services, todos } = context
    const owned = f.owned({ ...context, namespace: 'chat', seed: () => ({ conversations: [], turns: {} }), validate })
    const pending = new Map()
    const demo = services.mode === 'demo'
    function page(value, parse, offset) {
      if (!value || !Array.isArray(value.items) || value.items.length > 20 || !f.count(value.total) || value.total < value.items.length || value.limit !== 20 || value.offset !== offset) throw f.invalid()
      value.items.forEach(parse); return value
    }
    return Object.freeze({
      get persistent() { return owned.persistent },
      async conversations(offset = 0, options = {}) {
        const state = owned.owner()
        if (!f.count(offset)) throw f.fail('INVALID_INPUT', '잘못된 페이지')
        if (!demo) return page(await owned.request(state, `/api/v1/chat/conversations?limit=20&offset=${offset}`, options), conversation, offset)
        const all = owned.local(state).conversations.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))
        return { items: all.slice(offset, offset + 20), total: all.length, limit: 20, offset }
      },
      async create(options = {}) {
        const state = owned.owner()
        if (!demo) return conversation(await owned.request(state, '/api/v1/chat/conversations', { ...options, method: 'POST', json: {} }))
        const data = owned.local(state), now = new Date().toISOString()
        const row = { id: global.crypto.randomUUID(), title: '시연 정책 상담', created_at: now, updated_at: now }
        data.conversations.push(row); data.turns[row.id] = []; owned.save(state, data); return row
      },
      async messages(conversationId, offset = 0, options = {}) {
        const state = owned.owner()
        if (!f.uuid(conversationId) || !f.count(offset)) throw f.fail('INVALID_INPUT', '잘못된 대화 주소')
        if (!demo) return page(await owned.request(state, `/api/v1/chat/conversations/${conversationId}/messages?limit=20&offset=${offset}`, options), turn, offset)
        const data = owned.local(state)
        if (!data.conversations.some((row) => row.id === conversationId)) throw f.fail('CHAT_NOT_FOUND', '대화를 찾을 수 없습니다.', 404)
        return { items: data.turns[conversationId].slice(offset, offset + 20), total: data.turns[conversationId].length, limit: 20, offset }
      },
      async send(conversationId, question, { requestId, signal } = {}) {
        const state = owned.owner()
        if (!f.uuid(conversationId) || typeof question !== 'string' || !question.trim() || [...question.trim()].length > 2000) throw f.fail('INVALID_INPUT', '질문은 1~2000자로 입력해 주세요.')
        question = question.trim()
        const pendingKey = state.user.id + ':' + conversationId + ':' + question
        requestId = requestId || pending.get(pendingKey) || global.crypto.randomUUID()
        if (!f.uuid(requestId)) throw f.fail('INVALID_INPUT', '잘못된 요청 ID')
        pending.set(pendingKey, requestId)
        let result
        if (!demo) result = turn(await owned.request(state, `/api/v1/chat/conversations/${conversationId}/messages`, { signal, method: 'POST', json: { request_id: requestId, question, policy_ids: [] } }))
        else {
          const data = owned.local(state), target = data.conversations.find((row) => row.id === conversationId)
          if (!target) throw f.fail('CHAT_NOT_FOUND', '대화를 찾을 수 없습니다.', 404)
          const previous = data.turns[conversationId].find((row) => row.request_id === requestId)
          if (previous) {
            if (previous.question !== question) throw f.fail('CHAT_REQUEST_CONFLICT', '같은 요청의 질문이 다릅니다.', 409)
            result = previous
          } else {
            let related = []
            if (/할 일|todo|완료/i.test(question)) related = (await todos.list({ status: 'pending' })).items.slice(0, 2)
            owned.check(state)
            const known = /카드|정책|패스|기후|교통|할 일|todo/i.test(question)
            result = turn({ id: global.crypto.randomUUID(), request_id: requestId, turn_number: data.turns[conversationId].length + 1, question,
              answer: known ? '시연 답변입니다. 교통카드의 적용 범위와 확인할 절차를 정책 화면에서 살펴보세요. 실제 혜택·자격을 판정하거나 신청을 진행하지 않습니다.' : '시연 답변입니다. 현재 예시에서는 충분한 정보를 확인할 수 없습니다. 어떤 교통카드나 정책이 궁금한지 구체적으로 알려 주세요.',
              sources: [], needs_more_info: !known, external_used: false, created_at: new Date().toISOString(), related_todos: related })
            data.turns[conversationId].push(result); target.updated_at = result.created_at; owned.save(state, data)
          }
        }
        if (result.request_id !== requestId || result.question !== question) throw f.invalid()
        pending.delete(pendingKey)
        return f.copy(result)
      },
    })
  }
  function mountChat(main, context) {
    const { chat, services, profile } = context
    const page = f.scope(main, context, '교통 혜택이 궁금할 땐, BoSo에게', '내 상황에 맞는 교통카드와 정책을 함께 확인해보세요.')
    const params = new URLSearchParams(global.location.hash.split('?')[1] || '')
    let selected = params.get('id'), offset = 0, conversationOffset = 0, busy = false, sequence = 0
    const select = f.el('select', { 'aria-label': '이전 대화 선택', class: 'feature-select' }), tools = f.el('div', { class: 'feature-toolbar' })
    const messages = f.el('div', { class: 'chat-messages', role: 'log', 'aria-label': '상담 대화' })
    const more = f.button('이전 메시지 더 보기', () => { offset = Math.max(0, offset - 20); void loadMessages() }, 'secondary')
    const later = f.button('다음 메시지', () => { offset += 20; void loadMessages() }, 'secondary')
    const input = f.el('textarea', { id: 'chat-question', rows: 3, maxlength: 4000, placeholder: '궁금한 교통 정책을 물어보세요.', required: true })
    const send = f.el('button', { type: 'submit', class: 'button button--primary' }, '전송')
    const form = f.el('form', { method: 'post', class: 'chat-form' }, f.el('label', { for: 'chat-question' }, '질문 입력'), input, f.el('p', { class: 'field-help' }, '1~2000자 · 재전송할 때는 질문을 바꾸지 마세요.'), send)
    if (services.mode === 'live') form.prepend(f.el('p', { class: 'field-help' }, '질문은 서버에 저장되며 외부 AI로 전송될 수 있습니다. 개인정보는 입력하지 마세요.'))
    const pane = f.el('section', { class: 'card chat-pane', 'aria-label': 'BoSo AI 상담' }, f.el('h2', {}, 'BoSo AI'), messages, f.el('div', { class: 'feature-toolbar' }, more, later), form)
    const aside = f.el('aside', { class: 'chat-context' }, f.el('h2', {}, '내 상황을 알고 답변해요'), f.el('p', {}, '교통 정보를 확인하고 있어요.'), f.link('내 교통 정보 관리', '#/profile'))
    page.root.append(tools, f.el('div', { class: 'chat-columns' }, pane, aside))
    function setBusy(value) { more.disabled = later.disabled = value; busy = value; send.disabled = value; input.disabled = value; select.disabled = value; tools.querySelectorAll('button').forEach((b) => { b.disabled = value }); send.textContent = value ? '답변 확인 중…' : '전송' }
    const remember = () => global.history.replaceState(null, '', selected ? '#/chat?id=' + encodeURIComponent(selected) : '#/chat')
    function renderTurns(items, append = false) {
      if (!append) messages.replaceChildren()
      if (!items.length && !messages.children.length) messages.append(f.el('p', { class: 'chat-empty' }, '안녕하세요! 교통카드와 정책에 대해 궁금한 내용을 물어보세요.'))
      for (const row of items) {
        const answer = f.el('div', { class: 'chat-bubble chat-bubble--answer' }, f.el('span', { class: 'badge badge--blue' }, services.mode === 'demo' ? '시연 답변' : row.external_used ? 'AI 답변' : '안내 답변'), f.el('p', {}, row.answer))
        if (row.needs_more_info) answer.append(f.el('p', { class: 'field-help' }, '확인할 정보가 더 필요합니다.'))
        for (const source of row.sources) answer.append(f.el('a', { href: global.BoSo.safePolicyUrl(source.url), target: '_blank', rel: 'noopener noreferrer' }, source.title))
        for (const todo of row.related_todos) answer.append(f.link(todo.title, '#/todos?id=' + encodeURIComponent(todo.id)))
        if (services.mode === 'demo') answer.append(f.link('정책 예시 보기', '#/policies'))
        messages.append(f.el('p', { class: 'chat-bubble chat-bubble--question' }, row.question), answer)
      }
    }
    async function loadMessages() {
      const current = ++sequence
      if (!selected) { renderTurns([]); more.hidden = later.hidden = true; return true }
      try {
        const result = await chat.messages(selected, offset, { signal: page.signal() })
        if (!page.alive() || sequence !== current) return false
        renderTurns(result.items); more.hidden = offset === 0; later.hidden = offset + result.items.length >= result.total
        return true
      } catch (problem) { page.message(f.message(problem), true); return false }
    }
    async function loadConversations() {
      const result = await chat.conversations(conversationOffset, { signal: page.signal() })
      if (!page.alive()) return
      select.replaceChildren(f.el('option', { value: '' }, '새 대화'))
      for (const row of result.items) select.append(f.el('option', { value: row.id }, row.title + ' · ' + new Date(row.updated_at).toLocaleDateString('ko-KR')))
      if (selected && !result.items.some((row) => row.id === selected)) select.append(f.el('option', { value: selected }, '현재 선택한 대화'))
      select.value = selected || ''
      const older = f.button('이전 대화 목록', () => { conversationOffset += 20; void refresh() }, 'secondary')
      const newer = f.button('다음 대화 목록', () => { conversationOffset = Math.max(0, conversationOffset - 20); void refresh() }, 'secondary')
      older.hidden = conversationOffset + result.items.length >= result.total; newer.hidden = conversationOffset === 0
      tools.replaceChildren(select, f.button('새 대화', () => { if (!busy) { selected = null; offset = 0; select.value = ''; input.value = ''; remember(); renderTurns([]); more.hidden = later.hidden = true; page.message('새 질문을 입력해 주세요.') } }, 'secondary'), newer, older, f.button('대화 다시 불러오기', () => { void refresh() }, 'secondary'))
    }
    async function refresh() {
      if (busy) return
      setBusy(true)
      try { await loadConversations(); if (await loadMessages()) page.message('궁금한 내용을 입력해 주세요.') } catch (problem) { page.message(f.message(problem), true) } finally { if (page.alive()) setBusy(false) }
    }
    select.addEventListener('change', () => { if (busy) return; selected = select.value || null; offset = 0; remember(); void loadMessages() })
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (busy) return
      const question = input.value.trim()
      if (!question || [...question].length > 2000) { page.message('질문은 1~2000자로 입력해 주세요.', true); input.focus(); return }
      setBusy(true); page.message('답변을 확인하고 있어요.')
      try {
        if (!selected) selected = (await chat.create({ signal: page.signal() })).id
        if (!page.alive()) return
        remember()
        const result = await chat.send(selected, question, { signal: page.signal() })
        if (!page.alive()) return
        const old = messages.querySelector('.chat-empty'); if (old) old.remove()
        renderTurns([result], true); input.value = ''; await loadConversations(); page.message('답변을 확인해 주세요.')
      } catch (problem) { page.message(f.message(problem) + ' 대화를 다시 불러와 저장 여부를 확인하거나, 같은 질문으로 다시 전송해 주세요.', true) }
      finally { if (page.alive()) { setBusy(false); input.focus() } }
    })
    const start = global.setTimeout(async () => {
      if (page.alive()) void refresh()
      try {
        const saved = await profile.load({ signal: page.signal() })
        if (page.alive()) aside.querySelector('p').textContent = saved.profile.transport_cards.length ? '등록한 카드: ' + saved.profile.transport_cards.map((code) => saved.options.transport_cards.find((choice) => choice.code === code)?.label || code).join(', ') : '등록한 교통카드가 없습니다. 내 정보에서 입력해 주세요.'
      } catch { if (page.alive()) aside.querySelector('p').textContent = '교통 정보를 확인하지 못했습니다. 내 정보에서 다시 확인해 주세요.' }
    }, 0)
    return () => { global.clearTimeout(start); sequence++; page.dispose() }
  }
  Object.assign(global.BoSo, { createChat, mountChat })
})(globalThis)
