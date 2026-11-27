;(function (global) {
  'use strict'

  const categories = { transport_card: '교통카드', transport_fare: '교통 요금', transport_support: '교통 지원', transport_service: '교통 서비스' }
  const states = { active: '적용 중', ended: '종료', expired: '기간 만료' }
  const error = (code, message, status = 0) => new global.BoSo.ApiError(status, { code, message })
  // 아래 자료는 실제 정책·혜택·검수 결과가 아닌 화면 동작 전용 예시다.
  const exampleSource = { kind: 'example', title: '직접 작성한 화면 시연 자료 — 공식 출처 아님', url: 'https://example.invalid/policy', checked_on: '2026-11-27' }
  const version = (number, changes = {}) => ({
    version: number, title: '시연용 K-패스 안내', category: 'transport_card',
    summary: '교통카드 정책의 내용을 한곳에서 확인하는 화면 예시입니다.',
    content: number === 1 ? '초기 안내 예시: 정책 내용을 확인하는 단계만 표시했습니다. 실제 K-패스 정책이 아닙니다.' : '변경 안내 예시: 정책 내용과 함께 신청 조건·마감일을 확인하는 절차를 추가했습니다. 실제 K-패스 정책이 아닙니다.',
    change_summary: number === 1 ? '시연 자료 최초 등록' : '안내 문구와 확인 절차를 보완한 변경 예시입니다.',
    lifecycle: 'active', effective_from: number === 1 ? '2025-01-01' : '2026-01-01', effective_until: number === 1 ? '2025-12-31' : '2026-12-31',
    reviewed_on: number === 1 ? '2025-01-01' : '2026-11-27', reviewed_by: '시연 자료 작성자', sources: [{ ...exampleSource }],
    conditions: ['본 화면의 조건은 실제 정책 자격을 의미하지 않습니다.', '공식 자료와 별도 확인이 필요한 조건을 여기에 표시합니다.'],
    actions: [{ title: '신청 조건 확인 절차 예시', description: '실제 신청을 진행하지 않습니다. 공식 원문의 조건을 확인하는 단계 예시입니다.', due_date: '2026-12-31' }],
    ai_summary: '교통 정책의 주요 내용과 확인할 절차를 간단히 표시하는 요약 예시입니다.\n실시간 AI 생성 결과가 아니며 실제 혜택을 보장하지 않습니다.',
    ...changes,
  })
  const examples = [
    { policy_key: 'demo-k-pass', is_example: true, versions: [version(1), version(2)] },
    { policy_key: 'demo-climate-card', is_example: true, versions: [version(1, { title: '시연용 기후동행카드 안내', effective_from: '2026-01-01', effective_until: null, reviewed_on: '2026-11-26', summary: '카드별 안내와 별도 확인 조건을 표시하는 예시입니다.', content: '실제 기후동행카드의 사용 범위·금액·상품 조건은 포함하지 않습니다. 특정 카드 보유만으로 대상 여부를 판단하지 않습니다.', ai_summary: null })] },
    { policy_key: 'demo-fare', is_example: true, versions: [version(1, { title: '시연용 교통 요금 안내', category: 'transport_fare', effective_from: '2025-01-01', effective_until: '2025-12-31', reviewed_on: '2025-01-01', summary: '기간이 만료된 정책의 표시와 이전 안내를 확인하는 예시입니다.', content: '실제 교통 요금 변경이 아닙니다. 적용 기간이 지난 자료를 구분하는 화면 예시입니다.', actions: [] })] },
    { policy_key: 'demo-support', is_example: true, versions: [version(1, { title: '시연용 교통 지원 종료 안내', category: 'transport_support', lifecycle: 'ended', effective_from: '2026-01-01', effective_until: null, reviewed_on: '2026-11-25', summary: '종료된 지원 안내를 다른 정책과 구분하는 예시입니다.', content: '실제 교통 지원의 종료를 뜻하지 않습니다. 종료된 정책에는 새 행동을 안내하지 않는 흐름을 보여 줍니다.', actions: [] })] },
    { policy_key: 'demo-transit', is_example: true, versions: [version(1, { title: '시연용 대중교통 이용 안내', category: 'transport_service', effective_from: '2026-01-01', effective_until: null, reviewed_on: '2026-11-24', summary: '교통 서비스 카테고리와 정책 검색을 확인하는 예시입니다.', content: '실제 서비스 변경이나 운행 공지가 아닙니다. 서비스 안내를 분류해 보여 주는 예시입니다.' })] },
  ]
  const copy = (value) => JSON.parse(JSON.stringify(value))

  function safePolicyUrl(value) {
    try {
      if (typeof value !== 'string' || /[\s\\]/.test(value) || [...value].some((character) => character.charCodeAt(0) < 32)) return null
      const url = new URL(value)
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.search || url.hash || url.port) return null
      return url.href
    } catch { return null }
  }

  function normalizePolicyFilters({ q = '', category = '', state = '', page = 1 } = {}) {
    if (typeof q !== 'string' || q.trim().length > 100 ||
      category !== '' && !Object.hasOwn(categories, category) || state !== '' && !Object.hasOwn(states, state) ||
      !/^\d{1,5}$/.test(String(page)) || Number(page) < 1) throw error('INVALID_POLICY_FILTER', '검색어는 100자 이내로 입력하고 검색 조건을 다시 선택해 주세요.')
    return { q: q.trim(), category, state, page: Number(page) }
  }

  function createPolicies({ services, now = Date.now }) {
    const today = () => new Date(now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const available = () => {
      if (services.mode !== 'demo') throw error('POLICY_API_UNAVAILABLE', '정책 정보를 준비하고 있어요. 현재는 시연 모드에서 예시를 살펴볼 수 있습니다.')
    }
    function snapshot(policy, row) {
      const state = row.lifecycle === 'ended' ? 'ended' : row.effective_until && row.effective_until < today() ? 'expired' : 'active'
      return copy({ ...row, sources: row.sources.map((source) => ({ ...source, checked_on: row.reviewed_on })), policy_key: policy.policy_key, is_example: true, state, reference_date: today() })
    }
    function current(policy) {
      return policy.versions.filter((row) => row.effective_from <= today()).sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.version - a.version)[0]
    }
    return Object.freeze({
      async list(filters, { cards = null } = {}) {
        available()
        const normalized = normalizePolicyFilters(filters)
        const items = examples.flatMap((policy) => current(policy) ? [snapshot(policy, current(policy))] : [])
          .filter((row) => (cards === null || cards.some((card) => ({ k_pass: 'demo-k-pass', climate_card: 'demo-climate-card' })[card] === row.policy_key)) && (!normalized.q || (row.title + ' ' + row.summary + ' ' + row.change_summary).toLocaleLowerCase('ko-KR').includes(normalized.q.toLocaleLowerCase('ko-KR'))) &&
            (!normalized.category || row.category === normalized.category) && (!normalized.state || row.state === normalized.state))
          .sort((a, b) => b.reviewed_on.localeCompare(a.reviewed_on) || a.policy_key.localeCompare(b.policy_key))
        const pages = Math.max(1, Math.ceil(items.length / 3))
        const page = Math.min(normalized.page, pages)
        return { items: items.slice((page - 1) * 3, page * 3), total: items.length, pages, filters: { ...normalized, page } }
      },
      async detail(id) {
        available()
        const policy = examples.find((item) => item.policy_key === id)
        const selected = policy && current(policy)
        if (!selected) throw error('POLICY_NOT_FOUND', '정책을 찾을 수 없습니다.', 404)
        return { policy: snapshot(policy, selected), previous: policy.versions.filter((row) => row.version < selected.version).sort((a, b) => b.version - a.version)[0] ? snapshot(policy, policy.versions.filter((row) => row.version < selected.version).sort((a, b) => b.version - a.version)[0]) : null }
      },
    })
  }

  function policyMessage(problem) {
    if (['POLICY_API_UNAVAILABLE', 'INVALID_POLICY_FILTER', 'POLICY_NOT_FOUND'].includes(problem?.code)) return problem.message
    return '정책 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }

  function policyHref(filters = {}, id = null) {
    const query = new URLSearchParams()
    for (const name of ['q', 'category', 'state', 'page', 'tab']) if (filters[name]) query.set(name, filters[name])
    if (id !== null) query.set('id', id)
    return '#/policies' + (query.size ? '?' + query : '')
  }
  function fillPolicyMeta(scope, row) {
    const text = (name, value) => { scope.querySelector(`[data-policy-${name}]`).textContent = value }
    text('category', categories[row.category])
    text('state', states[row.state])
    text('summary', row.summary)
    text('period', '적용 기간(시연): ' + row.effective_from + ' ~ ' + (row.effective_until || '종료일 미정'))
    text('review', `검수일(시연): ${row.reviewed_on} · 버전 ${row.version}`)
  }
  function policyCard(row, filters, home = false) {
    const fragment = document.getElementById('policy-card').content.cloneNode(true)
    const article = fragment.querySelector('article')
    fillPolicyMeta(article, row)
    const link = article.querySelector('[data-policy-link]')
    link.textContent = row.title
    link.href = policyHref(filters, row.policy_key)
    article.querySelector('[data-policy-card-detail]').href = link.href
    article.querySelector('[data-policy-card-change]').textContent = row.change_summary
    article.querySelector('[data-policy-card-before]').textContent = row.version > 1 ? '이전 정책 안내를 확인해 주세요.' : '이전 버전이 없는 최초 안내입니다.'
    article.querySelector('[data-policy-card-after]').textContent = row.summary
    if (home) {
      const heading = document.createElement('h3')
      heading.append(link)
      article.querySelector('h2').replaceWith(heading)
    }
    return fragment
  }

  function mountPolicies(main, { policies, services, profile, store, home = false }) {
    let disposed = false
    let sequence = 0
    const controller = new AbortController()
    const params = new URLSearchParams(global.location.hash.split('?')[1] || '')
    const id = home ? null : params.get('id')
    const tab = params.get('tab') === 'related' ? 'related' : 'all'
    const capturedAuth = store.getState().auth
    let cards = null
    const find = (name) => main.querySelector(`[data-policy-${name}]`)
    const status = home ? find('home-status') : find('status')
    const list = home ? find('home-list') : find('list')
    const retry = home ? null : find('retry')
    const filters = Object.fromEntries(['q', 'category', 'state', 'page'].filter((name) => params.has(name)).map((name) => [name, params.get(name)]))
    if (id !== null) find('back').href = policyHref({ ...filters, tab })
    for (const link of main.querySelectorAll('[data-policy-tab]')) {
      const active = link.dataset.policyTab === tab
      link.classList.toggle('policy-tab--active', active)
      if (active) link.setAttribute('aria-current', 'page')
    }
    async function impact() {
      if (home) return
      const value = find('my-cards')
      if (capturedAuth.status !== 'authenticated') {
        value.textContent = '로그인 후 확인할 수 있어요.'
        return
      }
      try {
        const signal = global.AbortSignal?.any && global.AbortSignal?.timeout ? global.AbortSignal.any([controller.signal, global.AbortSignal.timeout(15000)]) : controller.signal
        const saved = await profile.load({ signal })
        if (disposed || store.getState().auth !== capturedAuth) return
        cards = saved.profile.transport_cards
        value.textContent = cards.length ? cards.map((code) => saved.options.transport_cards.find((item) => item.code === code)?.label || code).join(', ') : '등록한 카드가 없어요.'
        find('related-note').textContent = '등록한 카드와 관련된 안내입니다. 정책 적용 대상 여부를 뜻하지 않습니다.'
      } catch {
        if (!disposed) value.textContent = '교통 정보를 확인하지 못했어요. 내 정보에서 다시 확인해 주세요.'
      }
    }
    const fail = (problem) => {
      status.textContent = policyMessage(problem)
      status.setAttribute('role', 'alert')
      if (retry) retry.hidden = problem.code === 'POLICY_API_UNAVAILABLE'
    }
    function detail({ policy, previous }) {
      const scope = find('detail')
      fillPolicyMeta(scope, policy)
      scope.querySelector('h1').textContent = policy.title
      document.title = policy.title + ' | BoSo'
      find('content').textContent = policy.content
      find('ai').textContent = policy.ai_summary || '이 정책의 요약 예시가 없습니다. 정책 안내와 출처를 확인해 주세요.'
      find('change').textContent = policy.change_summary
      find('before').textContent = previous ? `버전 ${previous.version} · ${previous.effective_from}\n${previous.summary}\n${previous.content}` : '이전 버전이 없는 최초 안내입니다.'
      find('after').textContent = `버전 ${policy.version} · ${policy.effective_from}\n${policy.summary}\n${policy.content}`
      find('conditions').replaceChildren(...policy.conditions.map((value) => {
        const item = document.createElement('li'); item.textContent = value; return item
      }))
      find('actions').replaceChildren(...(policy.state === 'active' ? policy.actions : []).map((action) => {
        const item = document.createElement('li')
        item.textContent = `${action.title}: ${action.description} · 마감일(시연): ${action.due_date || '정해지지 않음'}`
        return item
      }))
      if (!find('actions').children.length) {
        const item = document.createElement('li'); item.textContent = '현재 안내할 절차가 없습니다.'; find('actions').append(item)
      }
      find('sources').replaceChildren(...policy.sources.map((source) => {
        const item = document.createElement('li')
        const description = document.createElement('p')
        description.textContent = `${source.title} · 확인일(시연): ${source.checked_on}`
        const address = document.createElement('span')
        address.textContent = source.url + ' (예시 주소, 연결하지 않음)'
        item.append(description, address)
        return item
      }))
      scope.hidden = false
      status.textContent = '시연 정책의 상세 내용입니다. 실제 정책과 구분해 주세요.'
    }
    async function load() {
      const current = ++sequence
      status.textContent = '정책 정보를 확인하고 있어요.'
      status.setAttribute('role', 'status')
      if (retry) { retry.disabled = true; retry.hidden = true }
      try {
        if (!home && id === null && tab === 'related' && cards === null && services.mode === 'demo') throw error('INVALID_POLICY_FILTER', '내 관련 소식은 로그인 후 내 정보에서 교통카드를 등록하면 확인할 수 있어요.')
        const result = id !== null ? await policies.detail(id) : await policies.list(home ? {} : filters, { cards: !home && tab === 'related' ? cards : null })
        if (disposed || sequence !== current) return
        if (home) {
          status.textContent = '개인별 AI 추천은 준비 중입니다. 정책 요약 예시를 먼저 살펴보세요.'
          if (result.items[0]) find('home-link').href = policyHref({}, result.items[0].policy_key)
          return
        }
        if (id !== null) detail(result)
        else {
          list.replaceChildren(...result.items.map((row) => policyCard(row, { ...result.filters, tab }, false)))
          status.textContent = home ? '시연 정책 소식입니다. 실제 정책이 아닙니다.' : result.total ? `시연 정책 ${result.total}개 · ${result.filters.page}/${result.pages} 페이지` : '검색 결과가 없습니다. 검색어나 선택 조건을 바꿔 보세요.'
          if (!home) {
            const pagination = find('pagination')
            pagination.replaceChildren()
            for (const [label, page] of [['이전 페이지', result.filters.page - 1], ['다음 페이지', result.filters.page + 1]]) {
              if (page < 1 || page > result.pages) continue
              const link = document.createElement('a')
              link.className = 'button button--secondary'
              link.textContent = label
              link.href = policyHref({ ...result.filters, page, tab })
              pagination.append(link)
            }
          }
        }
      } catch (problem) { if (!disposed && sequence === current) fail(problem) } finally { if (!disposed && retry) retry.disabled = false }
    }
    if (!home) {
      find('demo').hidden = services.mode !== 'demo'
      if (id !== null) find('back').href = policyHref({ ...filters, tab })
      else {
        const form = find('search')
        for (const [name, choices] of [['category', categories], ['state', states]]) {
          for (const [value, label] of Object.entries(choices)) {
            const option = document.createElement('option'); option.value = value; option.textContent = label; form.elements[name].append(option)
          }
          form.elements[name].value = filters[name] || ''
        }
        form.elements.q.value = filters.q || ''
        form.addEventListener('submit', (event) => {
          event.preventDefault()
          const selected = { q: form.elements.q.value, category: form.elements.category.value, state: form.elements.state.value, page: 1 }
          try {
            const normalized = normalizePolicyFilters(selected)
            const target = policyHref({ ...normalized, tab })
            if (global.location.hash === target) void load()
            else global.location.hash = target
          } catch (problem) { fail(problem) }
        })
        if (services.mode !== 'demo') for (const control of form.elements) control.disabled = true
      }
      retry.addEventListener('click', () => { void load() })
    }
    const start = global.setTimeout(async () => { await impact(); if (!disposed) void load() }, 0)
    return () => { disposed = true; sequence++; global.clearTimeout(start); controller.abort() }
  }

  Object.assign(global.BoSo, { createPolicies, normalizePolicyFilters, safePolicyUrl, policyMessage, mountPolicies, policyHref })
})(globalThis)
