type JsonRequestOptions = Omit<RequestInit, 'body' | 'credentials' | 'redirect'> & {
  json?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown
  readonly requestId: string | null

  constructor(status: number, payload: unknown, requestId: string | null) {
    const body = isRecord(payload) ? payload : {}
    super(typeof body.message === 'string' ? body.message : '요청을 처리하지 못했습니다.')
    this.name = 'ApiError'
    this.status = status
    this.code = typeof body.code === 'string' ? body.code : 'HTTP_ERROR'
    this.details = body.details ?? null
    this.requestId = typeof body.request_id === 'string' ? body.request_id : requestId
  }
}

// T는 호출자가 실제 API 계약에 맞춰 지정한다. 런타임 스키마 검증을 대신하지 않는다.
export function createApiClient(baseUrl: string) {
  const base = new URL(baseUrl)

  return async function request<T = unknown>(path: string, options: JsonRequestOptions = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
      throw new Error('API 경로는 /로 시작하는 서버 내부 경로여야 합니다.')
    }

    const url = new URL(path, base)
    if (url.origin !== base.origin) {
      throw new Error('다른 서버로 API 요청을 보낼 수 없습니다.')
    }

    const { json, ...init } = options
    const headers = new Headers(init.headers)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')
    if (json !== undefined) headers.set('Content-Type', 'application/json')

    // 인증 정책 확정 전 쿠키 전달·토큰 저장·자동 재시도를 하지 않는다.
    const response = await fetch(url, {
      ...init,
      headers,
      body: json === undefined ? undefined : JSON.stringify(json),
      credentials: 'omit',
      redirect: 'error',
    })

    const requestId = response.headers.get('X-Request-ID')
    if (response.status === 204 || response.status === 205) return undefined as T

    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      if (init.signal?.aborted) throw error
      if (!response.ok) throw new ApiError(response.status, null, requestId)
      throw new ApiError(response.status, {
        code: 'INVALID_RESPONSE',
        message: '서버 응답 형식을 확인해주세요.',
      }, requestId)
    }

    if (!response.ok) throw new ApiError(response.status, payload, requestId)
    return payload as T
  }
}
