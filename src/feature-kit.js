;(function (global) {
  'use strict'
  const fail = (code, message, status = 0) => new global.BoSo.ApiError(status, { code, message })
  const invalid = () => fail('INVALID_RESPONSE', '서버 응답 형식을 확인할 수 없습니다.')
  const uuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  const text = (value, max = 10000) => typeof value === 'string' && value.length > 0 && value.length <= max
  const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  const time = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
  const count = (value) => Number.isSafeInteger(value) && value >= 0
  const copy = (value) => JSON.parse(JSON.stringify(value))
  const today = () => new Date(Date.now() + 32400000).toISOString().slice(0, 10)
  function owned({ auth, services, store, namespace, seed, validate }) {
    const memory = new Map()
    let storage = null
    if (services.mode === 'demo') { try { storage = global.localStorage } catch { /* memory fallback */ } }
    const owner = () => {
      const state = store.getState().auth
      if (state?.status !== 'authenticated') throw fail('AUTH_REQUIRED', '로그인이 필요합니다.', 401)
      return state
    }
    const check = (state) => { if (state !== store.getState().auth) throw fail('AUTH_REQUIRED', '인증 상태가 변경되었습니다.', 401) }
    const key = (state) => `boso.demo.${namespace}.v1.${encodeURIComponent(state.user.id)}`
    function local(state) {
      check(state)
      if (!memory.has(state.user.id)) {
        let data = seed(state.user)
        if (storage) {
          try {
            const raw = storage.getItem(key(state))
            if (raw) { const record = JSON.parse(raw); if (record.version !== 1) throw invalid(); data = validate(record.data) }
          } catch { storage = null }
        }
        memory.set(state.user.id, copy(data))
      }
      return copy(memory.get(state.user.id))
    }
    function save(state, data) {
      check(state)
      validate(data)
      memory.set(state.user.id, copy(data))
      if (storage) { try { storage.setItem(key(state), JSON.stringify({ version: 1, data })) } catch { storage = null } }
    }
    return { owner, check, local, save, get persistent() { return Boolean(storage) },
      reset() {
        const state = owner()
        if (services.mode !== 'demo') throw fail('INVALID_INPUT', '시연 모드에서만 초기화할 수 있습니다.')
        // 읽기 실패로 저장이 중단되어도 기존 디스크 키 삭제를 다시 시도한다.
        try { global.localStorage?.removeItem(key(state)) } catch { throw fail('STORAGE_FAILED', '저장 정보를 삭제하지 못했습니다.') }
        memory.delete(state.user.id)
      },
      async request(state, path, options = {}) {
        check(state)
        const value = await auth.request(path, options)
        check(state)
        return value
      },
    }
  }
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag)
    for (const [key, value] of Object.entries(attrs)) if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value === true ? '' : String(value))
    for (const child of children.flat()) if (child !== null && child !== undefined) node.append(child instanceof Node ? child : document.createTextNode(String(child)))
    return node
  }
  function button(label, action, variant = 'primary') {
    const node = el('button', { type: 'button', class: `button button--${variant}` }, label)
    node.addEventListener('click', action)
    return node
  }
  const link = (label, href, variant = 'subtle') => el('a', { class: `button button--${variant}`, href }, label)
  function hero(title, description, pink = false) {
    const node = document.getElementById('policies-view').content.querySelector('.policy-hero').cloneNode(true)
    const heading = node.querySelector('h1'); heading.removeAttribute('id'); heading.textContent = title
    node.querySelector('p:last-child').textContent = description
    if (pink) node.classList.add('feature-hero--pink')
    return node
  }
  function scope(main, { store, services }, title, description, pink = false) {
    const root = main.querySelector('[data-feature-root]')
    const controller = new AbortController()
    const captured = store.getState().auth
    let disposed = false
    const alive = () => !disposed && root.isConnected && captured === store.getState().auth
    const status = el('p', { role: 'status', class: 'feature-status', tabindex: '-1' })
    root.append(hero(title, description, pink))
    if (services.mode === 'demo') root.append(el('p', { class: 'policy-demo-note' }, '시연 데이터 · 실제 정책·신청·AI 처리 결과가 아닙니다. 저장소 사용이 불가능하면 현재 창에서만 유지됩니다.'))
    root.append(status)
    return { root, status, alive, signal: () => global.AbortSignal?.any && global.AbortSignal?.timeout ? AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) : controller.signal,
      message(value, failed = false) { if (alive()) { status.textContent = value; status.setAttribute('role', failed ? 'alert' : 'status') } },
      dispose() { disposed = true; controller.abort() },
    }
  }
  function message(problem) {
    const chatMessages = { CHAT_NOT_FOUND: '대화를 찾을 수 없습니다. 새 대화를 시작해 주세요.', CHAT_REQUEST_CONFLICT: '이전 요청과 질문 내용이 다릅니다. 대화를 다시 불러와 주세요.', CHAT_RATE_LIMITED: '질문이 많습니다. 잠시 후 다시 전송해 주세요.', CHAT_PROVIDER_RATE_LIMITED: '상담 서비스가 혼잡합니다. 잠시 후 다시 전송해 주세요.', CHAT_PROVIDER_UNAVAILABLE: '상담 서비스에 연결하지 못했습니다. 질문을 유지했으니 대화를 확인한 후 다시 전송해 주세요.', CHAT_PROVIDER_INVALID_RESPONSE: '상담 응답을 확인할 수 없습니다. 대화를 다시 불러와 주세요.' }
    if (Object.hasOwn(chatMessages, problem?.code)) return chatMessages[problem.code]
    const messages = { TODO_NOT_ACTIVE: '정책과 대상 조건이 변경되어 완료 상태를 바꿀 수 없습니다. 할 일을 다시 확인해 주세요.', TODO_NOT_FOUND: '할 일을 찾을 수 없습니다.', CHAT_NOT_CONFIGURED: '챗봇 서버 설정이 준비되지 않았습니다.', NOTIFICATION_API_UNAVAILABLE: '알림 서비스를 준비하고 있어요. 현재는 시연 모드에서 확인할 수 있습니다.', INVALID_RESPONSE: '서버 응답 형식을 확인할 수 없습니다. 다시 불러와 주세요.', INVALID_INPUT: '입력 내용을 확인해 주세요.', STORAGE_FAILED: '브라우저 저장 정보를 삭제하지 못했습니다. 저장 권한을 확인해 주세요.' }
    return Object.hasOwn(messages, problem?.code) ? messages[problem.code] : global.BoSo.authMessage(problem)
  }
  global.BoSo.features = { fail, invalid, uuid, text, date, time, count, copy, today, owned, el, button, link, hero, scope, message }
})(globalThis)
