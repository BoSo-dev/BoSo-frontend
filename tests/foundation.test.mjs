import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { buildHtml, root } from '../scripts/build.mjs'

const source = await readFile(resolve(root, 'src/services.js'), 'utf8')
const context = vm.createContext({ URL, Headers })
vm.runInContext(source, context)
const { createServices, createHttpClient, createStore, parseApiBaseUrl } = context.BoSo

test('직접 연 파일은 live 설정에도 네트워크 없는 demo 모드다', async () => {
  let calls = 0
  const services = createServices({ protocol: 'file:', mode: 'live', fetchImpl: () => { calls++ } })
  assert.equal(services.mode, 'demo')
  await assert.rejects(services.request('/api/v1/policies'), { code: 'DEMO_NOT_IMPLEMENTED' })
  assert.equal(calls, 0)
  assert.equal(createServices({ protocol: 'http:' }).mode, 'live')
  assert.equal(createServices({ protocol: 'https:', mode: 'demo' }).mode, 'demo')
  assert.throws(() => createServices({ protocol: 'data:' }))
  assert.throws(() => createServices({ protocol: 'https:', mode: 'invalid' }))
})

test('API 설정은 비밀정보와 경로가 없는 HTTP(S) origin만 받는다', () => {
  assert.equal(parseApiBaseUrl('https://example.com:8443/'), 'https://example.com:8443')
  for (const value of ['invalid', 'file:///tmp', 'https://user:password@example.com', 'https://example.com/api', 'https://example.com/?secret=x']) {
    assert.throws(() => parseApiBaseUrl(value))
  }
})

test('JSON 요청, 쿠키, 취소 신호와 공통 오류 계약을 보존한다', async () => {
  let captured
  const signal = new AbortController().signal
  const request = createHttpClient('http://localhost:8000', async (url, init) => {
    captured = { url, init }
    return Response.json({ ok: true })
  })
  const result = await request('/api/v1/example', { method: 'POST', json: { name: 'BoSo' }, signal, headers: { 'X-CSRF-Token': 'test' } })
  assert.equal(result.ok, true)
  assert.equal(captured.url.href, 'http://localhost:8000/api/v1/example')
  assert.equal(captured.init.credentials, 'include')
  assert.equal(captured.init.redirect, 'error')
  assert.equal(captured.init.signal, signal)
  assert.equal(captured.init.headers.get('Content-Type'), 'application/json')
  assert.equal(captured.init.headers.get('X-CSRF-Token'), 'test')
  assert.equal(captured.init.body, '{"name":"BoSo"}')
  const failing = createHttpClient('http://localhost:8000', async () => Response.json({ code: 'TEST_ERROR', message: '검증 오류', details: { field: 'name' } }, { status: 422, headers: { 'X-Request-ID': 'request-test' } }))
  await assert.rejects(failing('/example'), (error) => error.status === 422 && error.code === 'TEST_ERROR' && error.requestId === 'request-test' && error.details.field === 'name')
})

test('외부 경로 거부, 빈 응답, 잘못된 JSON 및 네트워크 오류 처리', async () => {
  let calls = 0
  const request = createHttpClient('https://example.com', async () => { calls++; return new Response(null, { status: 204 }) })
  for (const path of ['https://other.test/', '//other.test/', '/\\other.test/', ' /other']) await assert.rejects(request(path))
  assert.equal(calls, 0)
  assert.equal(await request('/empty'), undefined)
  const invalid = createHttpClient('https://example.com', async () => new Response('<html>internal information</html>'))
  await assert.rejects(invalid('/bad'), { code: 'INVALID_RESPONSE' })
  const invalidError = createHttpClient('https://example.com', async () => new Response('<html>internal information</html>', { status: 500 }))
  await assert.rejects(invalidError('/bad'), (error) => error.status === 500 && !error.message.includes('internal'))
  for (const error of [new TypeError('Network unavailable'), new DOMException('Cancelled', 'AbortError')]) {
    let attempts = 0
    const offline = createHttpClient('https://example.com', async () => { attempts++; throw error })
    await assert.rejects(offline('/example'), (received) => received === error)
    assert.equal(attempts, 1)
  }
})

test('공통 상태는 변경 알림과 구독 해제를 지원한다', () => {
  const store = createStore({ route: 'home' })
  const initial = store.getState()
  let notified = 0
  const unsubscribe = store.subscribe(() => { notified++ })
  store.setState({ route: 'todos' })
  assert.equal(initial.route, 'home')
  assert.equal(store.getState().route, 'todos')
  assert.ok(Object.isFrozen(store.getState()))
  unsubscribe()
  store.setState({ route: 'home' })
  assert.equal(notified, 1)
})

test('단일 HTML은 CSS·일반 JS·원본 이미지를 포함하고 재현 가능하다', async () => {
  const html = await buildHtml()
  assert.equal(html, await buildHtml())
  assert.doesNotMatch(html, /<link\b|<script\b[^>]*\bsrc=/i)
  assert.match(html, /<style>/)
  const images = [...html.matchAll(/<img\b[^>]*\bsrc="data:image\/png;base64,([^"]+)"/g)]
  assert.equal(images.length, 2)
  for (const [index, name] of ['boso-logo', 'boso-guide'].entries()) {
    assert.deepEqual(Buffer.from(images[index][1], 'base64'), await readFile(resolve(root, `src/assets/${name}.png`)))
  }
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  for (const [, attributes, code] of scripts) {
    if (attributes.includes('application/json')) JSON.parse(code)
    else new vm.Script(code)
  }
  assert.equal(scripts.length, 3)
})

test('통합 빌드는 외부 자원과 모듈 스크립트를 거부한다', async () => {
  for (const html of [
    '<link rel="stylesheet" href="https://example.com/style.css">',
    '<script src="https://example.com/app.js"></script>',
    '<script type="module" src="./src/app.js"></script>',
    '<img src="./../BoSo-server/README.md">',
    '<script src=unquoted.js></script>',
  ]) await assert.rejects(buildHtml(html))
})
