;(function (global) {
  'use strict'

  const { ApiError } = global.BoSo
  const endpoint = '/api/v1/auth'
  const failure = (code, message, status = 0) => new ApiError(status, { code, message })

  function validateCredentials(email, password) {
    const normalized = email.trim().toLowerCase()
    if (normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw failure('INVALID_EMAIL', '올바른 이메일 주소를 입력해 주세요.')
    }
    if ([...password].length < 15 || [...password].length > 128) {
      throw failure('INVALID_PASSWORD', '비밀번호는 15~128자로 입력해 주세요.')
    }
    return { email: normalized, password }
  }

  function authMessage(error) {
    const messages = {
      INVALID_EMAIL: '올바른 이메일 주소를 입력해 주세요.',
      INVALID_PASSWORD: '비밀번호는 15~128자로 입력해 주세요.',
      PASSWORD_MISMATCH: '비밀번호 확인이 일치하지 않습니다.',
      EMAIL_IN_USE: '이미 등록된 이메일입니다. 로그인해 주세요.',
      INVALID_CREDENTIALS: '이메일 또는 비밀번호를 확인해 주세요.',
      AUTH_REQUIRED: '로그인이 필요하거나 세션이 만료되었습니다. 다시 로그인해 주세요.',
      AUTH_RATE_LIMITED: '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
      ORIGIN_NOT_ALLOWED: '현재 주소에서는 인증할 수 없습니다. 개발 화면은 localhost:5173으로 열어 주세요.',
      CSRF_FAILED: '인증 정보를 확인할 수 없습니다. 화면을 새로고침한 후 다시 시도해 주세요.',
      AUTH_NOT_CONFIGURED: '서버의 인증 설정이 준비되지 않았습니다. 관리자에게 확인해 주세요.',
      BUSY: '인증 요청을 처리 중입니다. 잠시 기다려 주세요.',
      DEMO_CRYPTO_UNAVAILABLE: '이 브라우저에서는 계정 생성 시연을 지원하지 않습니다. 시연 계정으로 둘러보기를 이용해 주세요.',
    }
    if (Object.hasOwn(messages, error?.code)) return messages[error.code]
    return '서버에 연결하지 못했거나 요청을 처리할 수 없습니다. 연결 상태를 확인한 후 다시 시도해 주세요.'
  }

  function createAuth({ services, store, crypto = global.crypto, now = Date.now }) {
    const requestApi = (path, options = {}) => services.request(path, { signal: global.AbortSignal?.timeout?.(15000), ...options })
    let access = null
    let csrf = null
    let expiresAt = 0
    let sessionEnd = 0
    let refreshing = null
    let busy = false
    let generation = 0
    const accounts = new Map()
    const publish = (status, user = null, error = null) => store.setState({ auth: Object.freeze({ status, user, error }) })
    const clear = (silent = false) => {
      generation++
      access = csrf = null
      expiresAt = sessionEnd = 0
      if (!silent) publish('anonymous')
    }
    async function exclusive(action) {
      if (busy) throw failure('BUSY', '인증 요청 처리 중입니다.')
      busy = true
      try { return await action() } finally { busy = false }
    }
    function userResponse(user) {
      if (!user || typeof user.id !== 'string' || typeof user.email !== 'string' || user.is_active !== true) {
        throw failure('INVALID_RESPONSE', '사용자 응답 형식 오류')
      }
      return Object.freeze({ id: user.id, email: user.email, is_active: true, created_at: user.created_at })
    }
    function acceptGrant(grant) {
      const end = Date.parse(grant?.session_expires_at)
      if (!grant || typeof grant.access_token !== 'string' || !grant.access_token ||
        grant.token_type !== 'bearer' || typeof grant.csrf_token !== 'string' || !grant.csrf_token ||
        !Number.isInteger(grant.expires_in) || grant.expires_in <= 0 || !Number.isFinite(end) || end <= now()) {
        throw failure('INVALID_RESPONSE', '인증 응답 형식 오류')
      }
      access = grant.access_token
      csrf = grant.csrf_token
      expiresAt = now() + grant.expires_in * 1000
      sessionEnd = end
    }
    async function refresh() {
      if (refreshing) return refreshing
      const version = generation
      refreshing = (async () => {
        try {
          if (!csrf) {
            const result = await requestApi(`${endpoint}/csrf`, { method: 'POST', json: {} })
            if (typeof result?.csrf_token !== 'string' || !result.csrf_token) throw failure('INVALID_RESPONSE', 'CSRF 응답 형식 오류')
            if (generation !== version) throw failure('AUTH_REQUIRED', '인증 상태가 변경되었습니다.', 401)
            csrf = result.csrf_token
          }
          const grant = await requestApi(`${endpoint}/refresh`, { method: 'POST', json: {}, headers: { 'X-CSRF-Token': csrf } })
          if (generation !== version) throw failure('AUTH_REQUIRED', '인증 상태가 변경되었습니다.', 401)
          acceptGrant(grant)
          const currentUser = store.getState().auth?.user
          if (currentUser) {
            const refreshedUser = userResponse(await requestApi(`${endpoint}/me`, { headers: { Authorization: `Bearer ${access}` } }))
            if (refreshedUser.id !== currentUser.id) throw failure('AUTH_REQUIRED', '계정이 변경되었습니다. 다시 로그인해 주세요.', 401)
          }
        } catch (error) {
          if (error.status === 401 && generation === version) clear()
          throw error
        }
      })()
      try { await refreshing } finally { refreshing = null }
    }
    async function request(path, options = {}) {
      if (busy) throw failure('BUSY', '인증 요청 처리 중입니다.')
      if (refreshing) await refreshing
      if (store.getState().auth?.status !== 'authenticated') throw failure('AUTH_REQUIRED', '로그인이 필요합니다.', 401)
      if (services.mode === 'demo') return services.request(path, options)
      if (sessionEnd <= now()) { clear(); throw failure('AUTH_REQUIRED', '세션이 만료되었습니다.', 401) }
      if (expiresAt <= now()) await refresh()
      const version = generation
      const sentToken = access
      const send = () => {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${access}`)
        return requestApi(path, { ...options, headers })
      }
      const currentResponse = (value) => {
        if (generation !== version) throw failure('AUTH_REQUIRED', '인증 상태가 변경되었습니다.', 401)
        return value
      }
      try { return currentResponse(await send()) } catch (error) {
        if (error.status !== 401) throw error
        if (generation !== version) throw failure('AUTH_REQUIRED', '인증 상태가 변경되었습니다.', 401)
        if (busy) throw failure('BUSY', '인증 요청 처리 중입니다.')
        // 같은 탭의 동시 401은 하나의 refresh를 공유한다. 업무 요청은 한 번만 재시도한다.
        if (refreshing) await refreshing
        if (generation !== version) throw failure('AUTH_REQUIRED', '인증 상태가 변경되었습니다.', 401)
        if (access === sentToken) await refresh()
        try { return currentResponse(await send()) } catch (retryError) {
          if (retryError.status === 401 && generation === version) clear()
          throw retryError
        }
      }
    }
    async function demoDigest(password, salt) {
      if (!crypto?.subtle) throw failure('DEMO_CRYPTO_UNAVAILABLE', '암호화 기능 없음')
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
      return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('')
    }
    return Object.freeze({
      request,
      initialize: () => exclusive(async () => {
        if (services.mode === 'demo') { clear(); return }
        clear(true)
        publish('loading')
        try {
          await refresh()
          publish('authenticated', userResponse(await requestApi(`${endpoint}/me`, { headers: { Authorization: `Bearer ${access}` } })))
        } catch (error) {
          clear()
          if (error.status !== 401) publish('unavailable', null, authMessage(error))
        }
      }),
      signup: (email, password, confirmation) => exclusive(async () => {
        const credentials = validateCredentials(email, password)
        if (password !== confirmation) throw failure('PASSWORD_MISMATCH', '비밀번호 확인 불일치')
        if (services.mode === 'live') return userResponse(await requestApi(`${endpoint}/signup`, { method: 'POST', json: credentials }))
        if (accounts.has(credentials.email)) throw failure('EMAIL_IN_USE', '이미 등록된 이메일입니다.', 409)
        if (!crypto?.subtle) throw failure('DEMO_CRYPTO_UNAVAILABLE', '암호화 기능 없음')
        const salt = crypto.getRandomValues(new Uint8Array(16))
        const digest = await demoDigest(password, salt)
        const user = userResponse({ id: crypto.randomUUID(), email: credentials.email, is_active: true, created_at: new Date(now()).toISOString() })
        accounts.set(credentials.email, { user, salt, digest })
        return user
      }),
      login: (email, password) => exclusive(async () => {
        if (store.getState().auth?.status === 'authenticated') throw failure('BUSY', '이미 로그인한 계정이 있습니다.')
        const credentials = validateCredentials(email, password)
        clear(true)
        if (refreshing) { try { await refreshing } catch { /* 이전 요청이 끝난 후 새 로그인 */ } }
        if (services.mode === 'demo') {
          const account = accounts.get(credentials.email)
          if (!account || await demoDigest(password, account.salt) !== account.digest) throw failure('INVALID_CREDENTIALS', '인증 실패', 401)
          publish('authenticated', account.user)
          return account.user
        }
        try {
          acceptGrant(await requestApi(`${endpoint}/login`, { method: 'POST', json: credentials }))
          const user = userResponse(await requestApi(`${endpoint}/me`, { headers: { Authorization: `Bearer ${access}` } }))
          publish('authenticated', user)
          return user
        } catch (error) { clear(true); throw error }
      }),
      logout: () => exclusive(async () => {
        if (refreshing) { try { await refreshing } catch { /* 서버 로그아웃으로 최종 확인 */ } }
        if (services.mode === 'live') {
          try {
            if (!csrf) {
              const result = await requestApi(`${endpoint}/csrf`, { method: 'POST', json: {} })
              if (typeof result?.csrf_token !== 'string' || !result.csrf_token) throw failure('INVALID_RESPONSE', 'CSRF 응답 형식 오류')
              csrf = result.csrf_token
            }
            await requestApi(`${endpoint}/logout`, { method: 'POST', json: {}, headers: { 'X-CSRF-Token': csrf } })
          } catch (error) { if (error.status !== 401) throw error }
        }
        clear()
      }),
      enterDemo: () => exclusive(async () => {
        if (services.mode !== 'demo') throw failure('AUTH_REQUIRED', '시연 모드에서만 이용할 수 있습니다.')
        const user = userResponse({ id: '00000000-0000-4000-8000-000000000001', email: 'demo@boso.example', is_active: true, created_at: '2026-01-01T00:00:00Z' })
        publish('authenticated', user)
      }),
    })
  }

  Object.assign(global.BoSo, { createAuth, validateCredentials, authMessage })
})(globalThis)
