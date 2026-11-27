import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { webcrypto } from 'node:crypto'
import vm from 'node:vm'

const context = vm.createContext({ URL, URLSearchParams, Headers, AbortSignal, crypto: webcrypto, TextEncoder })
for (const name of ['services', 'auth', 'feature-kit', 'todos']) vm.runInContext(await readFile(new URL(`../src/${name}.js`, import.meta.url), 'utf8'), context)
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
