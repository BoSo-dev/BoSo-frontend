import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError, createApiClient } from './client'

const request = createApiClient('http://localhost:8000')
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

test('확인된 health 경로의 JSON 응답을 읽는다', async () => {
  fetchMock.mockResolvedValue(Response.json({ status: 'ok' }))
  await expect(request('/health/live')).resolves.toEqual({ status: 'ok' })
  expect(fetchMock.mock.calls[0][0].toString()).toBe('http://localhost:8000/health/live')
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' })
})

test('JSON 본문과 호출자가 지정한 헤더·취소 신호를 전달한다', async () => {
  fetchMock.mockResolvedValue(Response.json({ accepted: true }))
  const controller = new AbortController()
  // /test는 fetch 대역만 사용하는 테스트 경로이며 실제 업무 API가 아니다.
  await request('/test', {
    method: 'POST', json: { example: true }, signal: controller.signal,
    headers: { 'X-Test': 'example' },
  })
  const options = fetchMock.mock.calls[0][1]!
  expect(options.body).toBe('{"example":true}')
  expect(new Headers(options.headers).get('Content-Type')).toBe('application/json')
  expect(new Headers(options.headers).get('X-Test')).toBe('example')
  expect(options.signal).toBe(controller.signal)
})

test('본문 없는 성공 응답을 허용한다', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  await expect(request('/test')).resolves.toBeUndefined()
})

test('백엔드 공통 오류와 요청 ID를 보존한다', async () => {
  fetchMock.mockResolvedValue(Response.json({
    code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.',
    details: [{ loc: ['body'] }], request_id: 'request-body',
  }, { status: 422 }))
  await expect(request('/test')).rejects.toMatchObject({
    status: 422, code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.',
    details: [{ loc: ['body'] }], requestId: 'request-body',
  })
})

test('HTML 오류 원문을 노출하지 않고 헤더의 요청 ID를 유지한다', async () => {
  fetchMock.mockResolvedValue(new Response('<html>internal information</html>', {
    status: 502, headers: { 'X-Request-ID': 'request-header' },
  }))
  await expect(request('/test')).rejects.toMatchObject({
    status: 502, code: 'HTTP_ERROR', message: '요청을 처리하지 못했습니다.',
    details: null, requestId: 'request-header',
  })
})

test('JSON이 아닌 성공 응답을 형식 오류로 구분한다', async () => {
  fetchMock.mockResolvedValue(new Response('<html>fallback</html>'))
  await expect(request('/test')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
})

test('네트워크 오류를 HTTP 오류로 변환하거나 재시도하지 않는다', async () => {
  const error = new TypeError('Network unavailable')
  fetchMock.mockRejectedValue(error)
  await expect(request('/test')).rejects.toBe(error)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('요청 취소를 유지한다', async () => {
  const controller = new AbortController()
  controller.abort()
  fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'))
  await expect(request('/test', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
})

test.each(['https://other.example/test', '//other.example/test', '/\\other.example/test', 'test'])(
  '외부 또는 잘못된 경로를 전송하지 않는다: %s', async (path) => {
    await expect(request(path)).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  },
)

test('공통 오류는 Error 인스턴스다', () => {
  expect(new ApiError(500, null, null)).toBeInstanceOf(Error)
})
