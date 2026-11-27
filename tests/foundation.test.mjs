import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { webcrypto } from 'node:crypto'
import { buildHtml, root } from '../scripts/build.mjs'

const source = await readFile(resolve(root, 'src/services.js'), 'utf8')
const context = vm.createContext({ URL, URLSearchParams, Headers, TextEncoder, AbortSignal, crypto: webcrypto })
vm.runInContext(source, context)
vm.runInContext(await readFile(resolve(root, 'src/auth.js'), 'utf8'), context)
vm.runInContext(await readFile(resolve(root, 'src/profile.js'), 'utf8'), context)
vm.runInContext(await readFile(resolve(root, 'src/policies.js'), 'utf8'), context)
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
  const expectedImages = new Set(await Promise.all(['boso-logo', 'boso-guide'].map(async (name) => (await readFile(resolve(root, `src/assets/${name}.png`))).toString('base64'))))
  assert.deepEqual(new Set(images.map((match) => match[1])), expectedImages)
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  for (const [, attributes, code] of scripts) {
    if (attributes.includes('application/json')) JSON.parse(code)
    else new vm.Script(code)
  }
  assert.equal(scripts.length, 10)
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

const testUser = { id: '00000000-0000-4000-8000-000000000002', email: 'user@example.com', is_active: true, created_at: '2026-01-01T00:00:00Z' }
const secretPassword = 'test-password-2026!'
const grant = (token = 'access-test') => ({ access_token: token, csrf_token: 'csrf-test', token_type: 'bearer', expires_in: 600, session_expires_at: new Date(Date.now() + 86400000).toISOString() })
const denied = (status = 401, code = 'AUTH_REQUIRED') => new context.BoSo.ApiError(status, { code, message: 'test error' })
function authFixture(request, mode = 'live', options = {}) {
  const store = createStore({ auth: { status: 'anonymous', user: null, error: null } })
  const auth = context.BoSo.createAuth({ services: { mode, request }, store, ...options })
  return { auth, store }
}

test('인증 입력은 서버 길이·이메일 정규화·비밀번호 확인을 따른다', async () => {
  const validate = context.BoSo.validateCredentials
  assert.equal(validate(' User@Example.com ', 'a'.repeat(15)).email, 'user@example.com')
  assert.equal(validate('user@example.com', '😀'.repeat(128)).password.length, 256)
  for (const password of ['a'.repeat(14), 'a'.repeat(129)]) assert.throws(() => validate('user@example.com', password), { code: 'INVALID_PASSWORD' })
  assert.throws(() => validate('bad email', secretPassword), { code: 'INVALID_EMAIL' })
  let calls = 0
  const { auth } = authFixture(async () => { calls++; return testUser })
  await assert.rejects(auth.signup(testUser.email, secretPassword, 'different'), { code: 'PASSWORD_MISMATCH' })
  assert.equal(calls, 0)
  await auth.signup(' USER@example.com ', secretPassword, secretPassword)
  assert.equal(calls, 1)
})

test('시연 회원가입·중복·비밀번호 검증·로그아웃은 네트워크와 저장소 없이 동작한다', async () => {
  let calls = 0
  const { auth, store } = authFixture(async () => { calls++; throw new Error('No network in demo') }, 'demo')
  await auth.initialize()
  await auth.signup(testUser.email, secretPassword, secretPassword)
  await assert.rejects(auth.signup(testUser.email, secretPassword, secretPassword), { code: 'EMAIL_IN_USE' })
  await assert.rejects(auth.login(testUser.email, 'incorrect-password'), { code: 'INVALID_CREDENTIALS' })
  assert.equal(store.getState().auth.status, 'anonymous')
  await auth.login(testUser.email, secretPassword)
  assert.equal(store.getState().auth.user.email, testUser.email)
  assert.ok(!JSON.stringify(store.getState()).includes(secretPassword))
  await auth.logout()
  await assert.rejects(auth.request('/private'), { code: 'AUTH_REQUIRED' })
  await auth.enterDemo()
  assert.equal(store.getState().auth.user.email, 'demo@boso.example')
  assert.equal(calls, 0)
})

test('세션 복원은 JSON CSRF → 갱신 → Bearer 사용자 확인이며 토큰은 상태에 넣지 않는다', async () => {
  const calls = []
  const { auth, store } = authFixture(async (path, init) => {
    calls.push({ path, init })
    if (path.endsWith('/csrf')) return { csrf_token: 'csrf-test' }
    if (path.endsWith('/refresh')) return grant()
    if (path.endsWith('/me')) return testUser
    if (path.endsWith('/logout')) return undefined
    throw new Error('Unexpected endpoint')
  })
  await auth.initialize()
  assert.deepEqual(calls.map(({ path }) => path), ['/api/v1/auth/csrf', '/api/v1/auth/refresh', '/api/v1/auth/me'])
  assert.equal(JSON.stringify(calls[0].init.json), '{}')
  assert.equal(calls[1].init.headers['X-CSRF-Token'], 'csrf-test')
  assert.equal(calls[2].init.headers.Authorization, 'Bearer access-test')
  assert.equal(store.getState().auth.status, 'authenticated')
  assert.ok(!JSON.stringify(store.getState()).includes('access-test'))
  assert.ok(!JSON.stringify(store.getState()).includes('csrf-test'))
  await auth.logout()
  assert.equal(calls[3].init.headers['X-CSRF-Token'], 'csrf-test')
  assert.equal(JSON.stringify(calls[3].init.json), '{}')
  assert.equal(store.getState().auth.user, null)
})

test('401 복원 실패는 비로그인, 연결 실패·잘못된 응답은 연결 오류로 구분한다', async () => {
  const unauthorized = authFixture(async () => { throw denied() })
  await unauthorized.auth.initialize()
  assert.equal(unauthorized.store.getState().auth.status, 'anonymous')
  for (const handler of [async () => { throw new TypeError('Network failure') }, async () => ({ csrf_token: 123 })]) {
    const { auth, store } = authFixture(handler)
    await auth.initialize()
    assert.equal(store.getState().auth.status, 'unavailable')
    assert.equal(store.getState().auth.user, null)
  }
})

test('동시 401은 한 번 갱신하고 원래 요청을 한 번씩만 재시도한다', async () => {
  let refreshes = 0
  const attempts = { '/a': 0, '/b': 0 }
  const { auth, store } = authFixture(async (path, init) => {
    if (path.endsWith('/login')) return grant('old-token')
    if (path.endsWith('/me')) return testUser
    if (path.endsWith('/refresh')) { refreshes++; await new Promise((resolve) => setTimeout(resolve, 5)); return grant('new-token') }
    attempts[path]++
    if (init.headers.get('Authorization') === 'Bearer old-token') throw denied()
    assert.equal(init.headers.get('Authorization'), 'Bearer new-token')
    return path
  })
  await auth.login(testUser.email, secretPassword)
  assert.deepEqual(await Promise.all([auth.request('/a'), auth.request('/b')]), ['/a', '/b'])
  assert.equal(refreshes, 1)
  assert.deepEqual(attempts, { '/a': 2, '/b': 2 })
  assert.equal(store.getState().auth.status, 'authenticated')
})

test('갱신 후에도 401이면 재시도 루프 없이 인증을 해제한다', async () => {
  let requests = 0
  let refreshes = 0
  const { auth, store } = authFixture(async (path) => {
    if (path.endsWith('/login')) return grant()
    if (path.endsWith('/me')) return testUser
    if (path.endsWith('/refresh')) { refreshes++; return grant('refreshed-token') }
    requests++
    throw denied()
  })
  await auth.login(testUser.email, secretPassword)
  await assert.rejects(auth.request('/private'), { status: 401 })
  assert.equal(requests, 2)
  assert.equal(refreshes, 1)
  assert.equal(store.getState().auth.status, 'anonymous')
})

test('만료 전에 갱신하고 세션 만료 후에는 요청을 보내지 않는다', async () => {
  let clock = Date.now()
  let refreshes = 0
  let requests = 0
  const { auth, store } = authFixture(async (path) => {
    if (path.endsWith('/login')) return { ...grant(), expires_in: 1 }
    if (path.endsWith('/me')) return testUser
    if (path.endsWith('/refresh')) { refreshes++; return grant() }
    requests++
    return { ok: true }
  }, 'live', { now: () => clock })
  await auth.login(testUser.email, secretPassword)
  clock += 2000
  await auth.request('/private')
  assert.equal(refreshes, 1)
  clock += 2 * 86400000
  await assert.rejects(auth.request('/private'), { code: 'AUTH_REQUIRED' })
  assert.equal(requests, 1)
  assert.equal(store.getState().auth.status, 'anonymous')
})

test('로그아웃 실패를 성공으로 숨기지 않고, 로그아웃 뒤 늦은 응답을 폐기한다', async () => {
  let failLogout = true
  let finishRequest
  const { auth, store } = authFixture(async (path) => {
    if (path.endsWith('/login')) return grant()
    if (path.endsWith('/me')) return testUser
    if (path.endsWith('/logout')) { if (failLogout) throw new TypeError('offline'); return undefined }
    return new Promise((resolve) => { finishRequest = resolve })
  })
  await auth.login(testUser.email, secretPassword)
  await assert.rejects(auth.logout(), /offline/)
  assert.equal(store.getState().auth.status, 'authenticated')
  const pending = auth.request('/private')
  failLogout = false
  await auth.logout()
  await auth.login(testUser.email, secretPassword)
  finishRequest({ private: 'old account data' })
  await assert.rejects(pending, { code: 'AUTH_REQUIRED' })
  assert.equal(store.getState().auth.status, 'authenticated')
})

test('갱신 거부·다른 계정 응답은 기존 업무 요청을 재실행하지 않는다', async () => {
  for (const cause of ['revoked', 'other-account']) {
    let refreshed = false
    let attempts = 0
    const { auth, store } = authFixture(async (path) => {
      if (path.endsWith('/login')) return grant()
      if (path.endsWith('/me')) return refreshed ? { ...testUser, id: 'different-user' } : testUser
      if (path.endsWith('/refresh')) {
        if (cause === 'revoked') throw new context.BoSo.ApiError(401, { code: 'AUTH_REQUIRED' })
        refreshed = true
        return grant('changed-token')
      }
      attempts++
      throw new context.BoSo.ApiError(401, { code: 'AUTH_REQUIRED' })
    })
    await auth.login(testUser.email, secretPassword)
    await assert.rejects(auth.request('/private'), { status: 401 })
    assert.equal(attempts, 1)
    assert.equal(store.getState().auth.status, 'anonymous')
  }
})

test('인증 실패·잘못된 토큰 응답은 성공 상태를 만들지 않고 중복 전송을 막는다', async () => {
  for (const cause of ['credentials', 'invalid-response']) {
    const { auth, store } = authFixture(async () => {
      if (cause === 'credentials') throw new context.BoSo.ApiError(401, { code: 'INVALID_CREDENTIALS' })
      return { ...grant(), access_token: null }
    })
    await assert.rejects(auth.login(testUser.email, secretPassword))
    assert.equal(store.getState().auth.status, 'anonymous')
  }
  let release
  let sends = 0
  const { auth } = authFixture(async (path) => {
    if (path.endsWith('/me')) return testUser
    sends++
    return new Promise((resolve) => { release = resolve })
  })
  const first = auth.login(testUser.email, secretPassword)
  await assert.rejects(auth.login(testUser.email, secretPassword), { code: 'BUSY' })
  release(grant())
  await first
  assert.equal(sends, 1)
})

const profileClock = () => Date.parse('2026-11-27T15:00:00Z')
const completeProfile = { birth_date: '2000-11-28', region_code: 'seoul', transport_cards: ['k_pass'], transport_modes: ['bus'] }
function profileFixture({ request = async () => { throw new Error('No network in demo') }, mode = 'demo', storage = null } = {}) {
  const store = createStore({ auth: { status: 'authenticated', user: testUser } })
  const service = context.BoSo.createProfile({ auth: { request }, services: { mode }, store, storage, now: profileClock })
  return { service, store }
}

test('프로필 날짜·선택 검증은 윤년·미래·중복·기타 카드 배타 조건을 검사한다', async () => {
  const { service } = profileFixture()
  const { options } = await service.load()
  const validate = (patch) => context.BoSo.validateProfile({ ...completeProfile, ...patch }, options, '2026-11-28')
  for (const birth_date of ['1899-12-31', '2026-11-29', '2025-02-29', '2000-11-28T00:00:00Z']) assert.throws(() => validate({ birth_date }), { code: 'INVALID_BIRTH_DATE' })
  assert.equal(validate({ birth_date: '2000-02-29' }).birth_date, '2000-02-29')
  assert.equal(validate({ birth_date: null, region_code: null, transport_cards: [], transport_modes: [] }).birth_date, null)
  for (const patch of [{ region_code: 'invalid' }, { transport_cards: ['k_pass', 'k_pass'] }, { transport_modes: ['bus', 'bus'] }, { transport_cards: ['other_or_none', 'k_pass'] }, { transport_modes: ['plane'] }]) assert.throws(() => validate(patch), { code: 'INVALID_PROFILE' })
})

test('시연 프로필은 한국 날짜·완성 상태·취소 없는 저장값을 계정별로 유지한다', async () => {
  const { service, store } = profileFixture()
  assert.equal((await service.load()).profile.reference_date, '2026-11-28')
  const saved = await service.save(completeProfile)
  assert.equal(saved.age, 26)
  assert.equal(saved.is_complete, true)
  assert.equal((await service.load()).profile.region_code, 'seoul')
  store.setState({ auth: { status: 'authenticated', user: { ...testUser, id: 'second-user' } } })
  assert.equal((await service.load()).profile.region_code, null)
  store.setState({ auth: { status: 'authenticated', user: testUser } })
  assert.equal((await service.load()).profile.region_code, 'seoul')
  const reset = await service.resetDemo()
  assert.equal(reset.profile.is_complete, false)
  assert.equal(reset.profile.birth_date, null)
})

test('로컬 시연 저장은 버전·사용자별 키를 쓰며 토큰·이메일 없이 복원·초기화한다', async () => {
  const records = new Map()
  const storage = { getItem: (key) => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: (key) => records.delete(key) }
  const { service } = profileFixture({ storage })
  await service.load()
  await service.save(completeProfile)
  const raw = [...records.values()][0]
  assert.ok(!raw.includes(testUser.email))
  assert.ok(!raw.includes('access_token'))
  assert.equal(JSON.parse(raw).version, 1)
  const restored = profileFixture({ storage }).service
  assert.equal((await restored.load()).profile.birth_date, completeProfile.birth_date)
  await restored.resetDemo()
  assert.equal(records.size, 0)
  for (const broken of [{ getItem() { throw new Error('blocked') } }, { getItem() { return '{invalid json' } }, { getItem() { return JSON.stringify({ version: 9 }) } }]) {
    const fallback = profileFixture({ storage: broken }).service
    await fallback.load()
    assert.equal(fallback.persistent, false)
    await fallback.save(completeProfile)
    assert.equal((await fallback.load()).profile.region_code, 'seoul')
  }
})

test('실제 프로필은 확인한 API로만 조회·PATCH하고 서버의 나이·완성 정보를 보존한다', async () => {
  const choices = (await profileFixture().service.load()).options
  let response = { ...completeProfile, user_id: testUser.id, email: testUser.email, reference_date: '2026-11-28', age: 37, is_complete: false, missing_fields: ['transport_modes'], updated_at: null }
  const calls = []
  const { service } = profileFixture({ mode: 'live', request: async (path, init) => {
    calls.push({ path, init })
    if (path.endsWith('/options')) return choices
    if (init.method === 'PATCH') response = { ...response, ...init.json }
    return response
  } })
  const loaded = await service.load()
  assert.equal(loaded.profile.age, 37)
  assert.equal(loaded.profile.is_complete, false)
  await service.save({ ...completeProfile, email: 'ignored@example.com', user_id: 'ignored-user' })
  assert.deepEqual(calls.map(({ path }) => path), ['/api/v1/me/options', '/api/v1/me', '/api/v1/me'])
  assert.equal(calls[2].init.method, 'PATCH')
  assert.equal(JSON.stringify(calls[2].init.json), JSON.stringify(completeProfile))
})

test('다른 사용자의 프로필·늦은 응답·저장 실패는 성공으로 표시하거나 보관하지 않는다', async () => {
  const choices = (await profileFixture().service.load()).options
  const response = { ...completeProfile, user_id: testUser.id, email: testUser.email, reference_date: '2026-11-28', age: 26, is_complete: true, missing_fields: [], updated_at: null }
  const wrong = profileFixture({ mode: 'live', request: async (path) => path.endsWith('/options') ? choices : { ...response, user_id: 'wrong-user' } })
  await assert.rejects(wrong.service.load(), { code: 'INVALID_RESPONSE' })
  let release
  const late = profileFixture({ mode: 'live', request: async (path) => path.endsWith('/options') ? choices : new Promise((resolve) => { release = resolve }) })
  const pending = late.service.load()
  late.store.setState({ auth: { status: 'anonymous', user: null } })
  release(response)
  await assert.rejects(pending, { code: 'AUTH_REQUIRED' })
  const failed = profileFixture({ mode: 'live', request: async (path, init) => {
    if (init.method === 'PATCH') throw new TypeError('network unavailable')
    return path.endsWith('/options') ? choices : response
  } })
  await failed.service.load()
  await assert.rejects(failed.service.save(completeProfile), /network unavailable/)
  await assert.rejects(failed.service.resetDemo(), { code: 'INVALID_PROFILE' })
  let finishSave
  const changing = profileFixture({ mode: 'live', request: async (path, init) => {
    if (init.method === 'PATCH') return new Promise((resolve) => { finishSave = resolve })
    return path.endsWith('/options') ? choices : response
  } })
  await changing.service.load()
  const saving = changing.service.save(completeProfile)
  changing.store.setState({ auth: { status: 'authenticated', user: { ...testUser, id: 'another-user' } } })
  finishSave(response)
  await assert.rejects(saving, { code: 'AUTH_REQUIRED' })
})

const demoPolicies = (date = '2026-11-28') => context.BoSo.createPolicies({ services: { mode: 'demo' }, now: () => Date.parse(date + 'T03:00:00Z') })

test('정책 시연은 검색·카테고리·상태·페이지를 조합하고 빈 결과를 구분한다', async () => {
  const policies = demoPolicies()
  const first = await policies.list()
  assert.equal(first.total, 5)
  assert.equal(first.items.length, 3)
  assert.equal(first.pages, 2)
  const second = await policies.list({ page: 2 })
  assert.equal(second.items.length, 2)
  assert.ok(!first.items.some((row) => second.items.some((item) => row.policy_key === item.policy_key)))
  assert.equal((await policies.list({ page: 99999 })).filters.page, 2)
  assert.equal((await policies.list({ category: 'transport_card' })).total, 2)
  assert.equal((await policies.list({}, { cards: ['k_pass'] })).total, 1)
  assert.equal((await policies.list({}, { cards: ['other_or_none'] })).total, 0)
  assert.equal((await policies.list({ state: 'active' })).total, 3)
  assert.equal((await policies.list({ state: 'ended' })).total, 1)
  assert.equal((await policies.list({ state: 'expired' })).total, 1)
  assert.equal((await policies.list({ q: ' K-패스 ', category: 'transport_card', state: 'active' })).total, 1)
  const none = await policies.list({ q: '<script>alert(1)</script>' })
  assert.equal(none.total, 0)
  assert.equal(none.items.length, 0)
})

test('정책 상세는 변경 전후·요약 없음·종료·만료·없는 주소를 명시한다', async () => {
  const policies = demoPolicies()
  const changed = await policies.detail('demo-k-pass')
  assert.equal(changed.policy.version, 2)
  assert.equal(changed.previous.version, 1)
  assert.notEqual(changed.previous.content, changed.policy.content)
  assert.equal(changed.policy.is_example, true)
  assert.equal(changed.policy.sources[0].kind, 'example')
  assert.equal(changed.policy.sources[0].checked_on, changed.policy.reviewed_on)
  const noSummary = await policies.detail('demo-climate-card')
  assert.equal(noSummary.policy.ai_summary, null)
  assert.equal(noSummary.previous, null)
  assert.equal((await policies.detail('demo-support')).policy.actions.length, 0)
  assert.equal((await policies.detail('demo-fare')).policy.state, 'expired')
  for (const id of ['missing', '__proto__', '', 'https://evil.example']) await assert.rejects(policies.detail(id), { code: 'POLICY_NOT_FOUND' })
  changed.policy.content = 'mutated'
  assert.notEqual((await policies.detail('demo-k-pass')).policy.content, 'mutated')
})

test('정책 적용 시작일·종료일 포함 경계와 한국 기준일을 구분한다', async () => {
  assert.equal((await demoPolicies('2025-12-31').detail('demo-k-pass')).policy.version, 1)
  assert.equal((await demoPolicies('2026-01-01').detail('demo-k-pass')).policy.version, 2)
  assert.equal((await demoPolicies('2026-12-31').detail('demo-k-pass')).policy.state, 'active')
  assert.equal((await demoPolicies('2027-01-01').detail('demo-k-pass')).policy.state, 'expired')
  const kst = context.BoSo.createPolicies({ services: { mode: 'demo' }, now: () => Date.parse('2026-12-31T15:00:00Z') })
  assert.equal((await kst.detail('demo-k-pass')).policy.reference_date, '2027-01-01')
})

test('미확정 정책 HTTP 계약은 경로 추측·네트워크 호출·시연 성공 대체를 하지 않는다', async () => {
  let called = 0
  const live = context.BoSo.createPolicies({ services: { mode: 'live', request() { called++ } } })
  await assert.rejects(live.list(), { code: 'POLICY_API_UNAVAILABLE' })
  await assert.rejects(live.detail('demo-k-pass'), { code: 'POLICY_API_UNAVAILABLE' })
  assert.equal(called, 0)
})

test('정책 필터·URL은 허용 값을 검사하고 검색어를 안전한 해시로 인코딩한다', () => {
  const { normalizePolicyFilters, policyHref, safePolicyUrl } = context.BoSo
  for (const filter of [{ q: 'x'.repeat(101) }, { category: '__proto__' }, { state: 'constructor' }, { page: 0 }, { page: -1 }, { page: '1.5' }, { page: '1x' }]) assert.throws(() => normalizePolicyFilters(filter), { code: 'INVALID_POLICY_FILTER' })
  const href = policyHref({ q: 'a&state=ended', category: 'transport_card', page: 2 }, 'demo-k-pass')
  const query = new URLSearchParams(href.split('?')[1])
  assert.equal(query.get('q'), 'a&state=ended')
  assert.equal(query.get('state'), null)
  assert.equal(query.get('id'), 'demo-k-pass')
  assert.equal(safePolicyUrl('https://example.com/policy'), 'https://example.com/policy')
  for (const url of ['javascript:alert(1)', '//evil.example', 'http://example.com', 'https://user:pass@example.com', 'https://example.com?q=secret', 'https://example.com/#x', 'https://example.com:8443/', 'https://example.com/\npath']) assert.equal(safePolicyUrl(url), null)
})
