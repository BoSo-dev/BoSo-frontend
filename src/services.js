// 일반 스크립트로 작성해 단일 HTML에서도 외부 모듈 없이 실행한다.
;(function (global) {
  'use strict'

  class ApiError extends Error {
    constructor(status, payload, requestId = null) {
      const body = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
      super(typeof body.message === 'string' ? body.message : '요청을 처리하지 못했습니다.')
      this.name = 'ApiError'
      this.status = status
      this.code = typeof body.code === 'string' ? body.code : 'HTTP_ERROR'
      this.details = body.details ?? null
      this.requestId = typeof body.request_id === 'string' ? body.request_id : requestId
    }
  }

  function parseApiBaseUrl(value = 'http://localhost:8000') {
    try {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) throw new Error()
      return url.origin
    } catch {
      throw new Error('API 서버는 경로·인증정보 없는 HTTP(S) 주소로 설정하세요.')
    }
  }

  function createHttpClient(baseUrl, fetchImpl = global.fetch) {
    const base = parseApiBaseUrl(baseUrl)
    return async function request(path, options = {}) {
      if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
        throw new Error('API 경로는 /로 시작하는 서버 내부 경로여야 합니다.')
      }
      const url = new URL(path, base)
      if (url.origin !== base) throw new Error('다른 서버로 요청할 수 없습니다.')
      const { json, ...init } = options
      const headers = new Headers(init.headers)
      if (!headers.has('Accept')) headers.set('Accept', 'application/json')
      if (json !== undefined) headers.set('Content-Type', 'application/json')
      const response = await fetchImpl(url, {
        ...init, headers, body: json === undefined ? undefined : JSON.stringify(json),
        credentials: 'include', redirect: 'error',
      })
      const requestId = response.headers.get('X-Request-ID')
      if (response.status === 204 || response.status === 205) return undefined
      let payload
      try {
        payload = await response.json()
      } catch (error) {
        if (init.signal?.aborted) throw error
        if (!response.ok) throw new ApiError(response.status, null, requestId)
        throw new ApiError(response.status, {
          code: 'INVALID_RESPONSE', message: '서버 응답 형식을 확인해주세요.',
        }, requestId)
      }
      if (!response.ok) throw new ApiError(response.status, payload, requestId)
      return payload
    }
  }

  // 파일 실행은 항상 demo. 실제 서비스 실패를 demo 성공으로 바꾸지 않는다.
  // 후속 기능은 동일한 request(path, options) 계약에 각 demo 처리기를 추가한다.
  function createServices({ protocol, mode = 'auto', apiBaseUrl, fetchImpl } = {}) {
    if (!['file:', 'http:', 'https:'].includes(protocol)) throw new Error('지원하지 않는 실행 주소입니다.')
    if (!['auto', 'demo', 'live'].includes(mode)) throw new Error('실행 모드를 확인하세요.')
    const baseUrl = parseApiBaseUrl(apiBaseUrl)
    const selected = protocol === 'file:' || mode === 'demo' ? 'demo' : 'live'
    return Object.freeze({
      mode: selected,
      request: selected === 'demo'
        ? async () => { throw new ApiError(0, { code: 'DEMO_NOT_IMPLEMENTED', message: '아직 준비 중인 기능입니다.' }) }
        : createHttpClient(baseUrl, fetchImpl),
    })
  }

  function createStore(initialState) {
    let state = Object.freeze({ ...initialState })
    const listeners = new Set()
    return Object.freeze({
      getState: () => state,
      setState(patch) {
        state = Object.freeze({ ...state, ...patch })
        for (const listener of [...listeners]) listener(state)
      },
      subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    })
  }

  global.BoSo = { ApiError, parseApiBaseUrl, createHttpClient, createServices, createStore }
})(globalThis)
