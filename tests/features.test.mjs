import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { webcrypto } from 'node:crypto'
import vm from 'node:vm'

const context = vm.createContext({ URL, URLSearchParams, Headers, AbortSignal, crypto: webcrypto, TextEncoder })
for (const name of ['services', 'auth', 'policies', 'feature-kit', 'todos', 'chat', 'notifications']) vm.runInContext(await readFile(new URL(`../src/${name}.js`, import.meta.url), 'utf8'), context)
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'demo@example.com' }
function fixture(mode = 'demo', request = async () => { throw new Error('No network in demo') }, extra = {}) {
  const store = context.BoSo.createStore({ auth: { status: 'authenticated', user } })
  const options = { auth: { request }, services: { mode }, store, ...extra }
  return { store, options, todos: context.BoSo.createTodos(options) }
}
test('To-Do 시연 완료·취소·단계·필터·계정 분리', async () => {
  const { todos, store } = fixture()
  const list = await todos.list()
  assert.equal(list.items.length, 3)
  const id = list.items[0].id
  await todos.step(id, 0, true)
  assert.equal((await todos.detail(id)).demo_steps[0].done, true)
  await todos.complete(id, true)
  assert.equal((await todos.list({ status: 'completed' })).items.length, 1)
  assert.equal((await todos.summary()).pending, 2)
  await todos.complete(id, false)
  assert.equal((await todos.detail(id)).completed_at, null)
  store.setState({ auth: { status: 'authenticated', user: { ...user, id: '00000000-0000-4000-8000-000000000002' } } })
  assert.equal((await todos.detail(id)).demo_steps[0].done, false)
  store.setState({ auth: { status: 'anonymous', user: null } })
  await assert.rejects(todos.list(), { code: 'AUTH_REQUIRED' })
})
test('실제 To-Do는 계약 경로·JSON만 사용하고 잘못된 응답을 거부한다', async () => {
  const sample = (await fixture().todos.list()).items[0]
  const calls = []
  const { todos } = fixture('live', async (path, init = {}) => {
    calls.push({ path, init })
    if (init.method === 'PATCH') return { ...sample, status: 'completed' }
    if (path.endsWith('/sync')) return { created: 0, updated: 0, archived: 0, assessments: [] }
    return { items: [sample], total: 1, limit: 20, offset: 0 }
  })
  await todos.list()
  await todos.complete(sample.id, true)
  await todos.sync()
  assert.equal(calls[0].path, '/api/v1/todos?status=pending&limit=20&offset=0')
  assert.equal(calls[1].path, '/api/v1/todos/' + sample.id)
  assert.equal(JSON.stringify(calls[1].init.json), '{"completed":true}')
  assert.equal(JSON.stringify(calls[2].init.json), '{}')
  await assert.rejects(todos.complete(sample.id, 'yes'), { code: 'INVALID_INPUT' })
  await assert.rejects(fixture('live', async () => ({ items: [{}], total: 1, limit: 20, offset: 0 })).todos.list(), { code: 'INVALID_RESPONSE' })
})
test('To-Do의 늦은 응답은 계정 변경 후 폐기한다', async () => {
  const sample = (await fixture().todos.list()).items[0]
  let finish
  const { todos, store } = fixture('live', async () => new Promise((resolve) => { finish = resolve }))
  const pending = todos.detail(sample.id)
  store.setState({ auth: { status: 'anonymous', user: null } })
  finish(sample)
  await assert.rejects(pending, { code: 'AUTH_REQUIRED' })
})

function chatFixture(mode = 'demo', request = async () => { throw new Error('No demo network') }) {
  const store = context.BoSo.createStore({ auth: { status: 'authenticated', user } })
  const settings = { services: { mode }, store, auth: { request } }
  const todos = context.BoSo.createTodos(settings)
  return { store, chat: context.BoSo.createChat({ ...settings, todos }) }
}
test('시연 대화는 중복 요청을 재사용하고 계정별 기록을 분리한다', async () => {
  const { chat, store } = chatFixture()
  const conversation = await chat.create()
  const requestId = webcrypto.randomUUID()
  const one = await chat.send(conversation.id, '할 일 확인', { requestId })
  const two = await chat.send(conversation.id, '할 일 확인', { requestId })
  assert.equal(one.id, two.id)
  assert.equal(one.external_used, false)
  assert.equal(one.related_todos.length, 2)
  assert.equal((await chat.messages(conversation.id)).items.length, 1)
  await assert.rejects(chat.send(conversation.id, '다른 질문', { requestId }), { code: 'CHAT_REQUEST_CONFLICT' })
  store.setState({ auth: { status: 'authenticated', user: { ...user, id: webcrypto.randomUUID() } } })
  assert.equal((await chat.conversations()).total, 0)
  await assert.rejects(chat.messages(conversation.id), { code: 'CHAT_NOT_FOUND' })
})
test('실제 질문의 재시도는 같은 request_id·질문을 보존한다', async () => {
  const demo = chatFixture().chat
  const c = await demo.create()
  const example = await demo.send(c.id, '정책 확인')
  let attempts = 0
  const captured = []
  const { chat } = chatFixture('live', async (path, options) => {
    captured.push({ path, body: options.json })
    attempts++
    if (attempts === 1) throw new TypeError('network')
    return { ...example, request_id: options.json.request_id, question: options.json.question }
  })
  await assert.rejects(chat.send(c.id, '정책 확인'), /network/)
  await chat.send(c.id, '정책 확인')
  assert.equal(captured[0].body.request_id, captured[1].body.request_id)
  assert.equal(captured[1].path, `/api/v1/chat/conversations/${c.id}/messages`)
  assert.equal(JSON.stringify(captured[1].body.policy_ids), '[]')
  await assert.rejects(chat.send(c.id, 'x'.repeat(2001)), { code: 'INVALID_INPUT' })
})
test('챗봇의 위험한 근거 주소와 잘못된 응답을 거부한다', async () => {
  const demo = chatFixture().chat
  const c = await demo.create(), example = await demo.send(c.id, '정책 확인')
  const { chat } = chatFixture('live', async (path, options) => ({ ...example, request_id: options.json.request_id, sources: [{ version_id: webcrypto.randomUUID(), policy_id: webcrypto.randomUUID(), source_key: 'test', title: 'test', url: 'javascript:alert(1)' }] }))
  await assert.rejects(chat.send(c.id, '정책 확인'), { code: 'INVALID_RESPONSE' })
})
test('시연 알림 읽음·모두 읽음·계정별 분리와 구독', async () => {
  const { options, store } = fixture()
  const notifications = context.BoSo.createNotifications(options)
  let changes = 0
  const unsubscribe = notifications.subscribe(() => { changes++ })
  assert.equal((await notifications.summary()).unread, 2)
  const first = (await notifications.list('unread')).items[0]
  await notifications.read(first.id)
  assert.equal((await notifications.list('read')).total, 1)
  await notifications.readAll()
  assert.equal((await notifications.summary()).unread, 0)
  assert.equal(changes, 2)
  unsubscribe()
  store.setState({ auth: { status: 'authenticated', user: { ...user, id: webcrypto.randomUUID() } } })
  assert.equal((await notifications.summary()).unread, 2)
})
test('실제 알림 계약이 없으면 임의 API와 시연 대체를 사용하지 않는다', async () => {
  let requests = 0
  const { options } = fixture('live', async () => { requests++; throw new Error('Unexpected request') })
  const notifications = context.BoSo.createNotifications(options)
  await assert.rejects(notifications.list(), { code: 'NOTIFICATION_API_UNAVAILABLE' })
  await assert.rejects(notifications.readAll(), { code: 'NOTIFICATION_API_UNAVAILABLE' })
  assert.equal(requests, 0)
})
