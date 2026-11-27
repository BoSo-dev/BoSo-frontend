;(function (global) {
  'use strict'
  const fields = ['birth_date', 'region_code', 'transport_cards', 'transport_modes']
  const error = (code, message) => new global.BoSo.ApiError(0, { code, message })
  const demoOptions = {
    regions: ['seoul:서울', 'busan:부산', 'daegu:대구', 'incheon:인천', 'gwangju:광주', 'daejeon:대전', 'ulsan:울산', 'sejong:세종', 'gyeonggi:경기', 'gangwon:강원', 'chungbuk:충북', 'chungnam:충남', 'jeonbuk:전북', 'jeonnam:전남', 'gyeongbuk:경북', 'gyeongnam:경남', 'jeju:제주'],
    transport_cards: ['k_pass:K-패스', 'climate_card:기후동행카드', 'other_or_none:기타 / 이용 카드 없음'],
    transport_modes: ['bus:버스', 'subway:지하철'],
  }
  const empty = () => ({ birth_date: null, region_code: null, transport_cards: [], transport_modes: [] })
  const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value

  function validateProfile(values, options, referenceDate) {
    const birth = values.birth_date || null
    if (birth !== null && (!validDate(birth) || birth < '1900-01-01' || birth > referenceDate)) {
      throw error('INVALID_BIRTH_DATE', '생년월일은 1900년 1월 1일부터 기준일 사이의 올바른 날짜로 입력해 주세요.')
    }
    const region = values.region_code || null
    if (region !== null && !options.regions.some(({ code }) => code === region)) throw error('INVALID_PROFILE', '거주 지역을 다시 선택해 주세요.')
    const result = { birth_date: birth, region_code: region }
    for (const [name, max] of [['transport_cards', 3], ['transport_modes', 2]]) {
      const selected = values[name]
      if (!Array.isArray(selected) || selected.length > max || new Set(selected).size !== selected.length ||
        selected.some((code) => !options[name].some((choice) => choice.code === code))) {
        throw error('INVALID_PROFILE', '교통카드와 이동 수단을 다시 선택해 주세요.')
      }
      result[name] = [...selected]
    }
    if (result.transport_cards.includes('other_or_none') && result.transport_cards.length > 1) {
      throw error('INVALID_PROFILE', '기타 / 이용 카드 없음은 다른 카드와 함께 선택할 수 없습니다.')
    }
    return result
  }

  function profileMessage(problem) {
    if (problem?.code === 'DEMO_STORAGE_FAILED') return '브라우저 저장에 접근할 수 없어 시연 정보를 삭제하지 못했습니다. 저장 권한을 확인한 후 다시 초기화해 주세요.'
    if (['INVALID_PROFILE', 'INVALID_BIRTH_DATE'].includes(problem?.code)) return problem.message
    if (problem?.code === 'INVALID_RESPONSE') return '서버의 교통 정보 형식을 확인할 수 없습니다. 다시 불러오거나 관리자에게 문의해 주세요.'
    if (problem?.status === 422) return '저장할 정보를 확인해 주세요. 선택 항목과 생년월일을 다시 확인한 후 저장해 주세요.'
    return global.BoSo.authMessage(problem)
  }

  function createProfile({ auth, services, store, storage, now = Date.now }) {
    if (storage === undefined && services.mode === 'demo') {
      try { storage = global.localStorage } catch { storage = null }
    }
    const memory = new Map()
    let cache = null
    let persistent = Boolean(storage)
    const owner = () => {
      const state = store.getState().auth
      if (state?.status !== 'authenticated') throw new global.BoSo.ApiError(401, { code: 'AUTH_REQUIRED' })
      return state
    }
    const checkOwner = (captured) => {
      if (store.getState().auth !== captured) throw new global.BoSo.ApiError(401, { code: 'AUTH_REQUIRED' })
    }
    const key = (id) => 'boso.demo.profile.v1.' + encodeURIComponent(id)
    const today = () => new Date(now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const localOptions = () => Object.fromEntries(Object.entries(demoOptions).map(([name, choices]) => [name, choices.map((value) => {
      const [code, label] = value.split(':')
      return { code, label }
    })]))
    function optionsResponse(value) {
      for (const name of ['regions', 'transport_cards', 'transport_modes']) {
        if (!Array.isArray(value?.[name]) || !value[name].length || value[name].some((item) =>
          typeof item?.code !== 'string' || !item.code || typeof item.label !== 'string' || !item.label) ||
          new Set(value[name].map(({ code }) => code)).size !== value[name].length) throw error('INVALID_RESPONSE', '선택 항목 응답 오류')
      }
      return value
    }
    function profileResponse(value, options, captured) {
      if (!value || value.user_id !== captured.user.id || typeof value.email !== 'string' || !validDate(value.reference_date) ||
        typeof value.is_complete !== 'boolean' || !Array.isArray(value.missing_fields) || value.missing_fields.some((name) => !fields.includes(name)) ||
        !(value.age === null || Number.isInteger(value.age) && value.age >= 0) ||
        !(value.updated_at === null || typeof value.updated_at === 'string' && Number.isFinite(Date.parse(value.updated_at))) ||
        !(value.birth_date === null || validDate(value.birth_date)) || !(value.region_code === null || typeof value.region_code === 'string')) {
        throw error('INVALID_RESPONSE', '프로필 응답 오류')
      }
      try { validateProfile(value, options, value.reference_date) } catch { throw error('INVALID_RESPONSE', '프로필 선택 항목 오류') }
      return value
    }
    function demoResponse(values, captured, updatedAt = null) {
      const date = today()
      const birth = values.birth_date
      const age = birth ? Number(date.slice(0, 4)) - Number(birth.slice(0, 4)) - Number(date.slice(5) < birth.slice(5)) : null
      const missing = fields.filter((name) => !values[name] || Array.isArray(values[name]) && !values[name].length)
      return { ...values, user_id: captured.user.id, email: captured.user.email, reference_date: date, age,
        is_complete: !missing.length, missing_fields: missing, updated_at: updatedAt }
    }
    function readDemo(captured, options) {
      const id = captured.user.id
      if (memory.has(id)) return memory.get(id)
      let result = { values: empty(), updatedAt: null }
      if (persistent) {
        try {
          const raw = storage.getItem(key(id))
          if (raw) {
            const saved = JSON.parse(raw)
            if (saved.version !== 1) throw error('INVALID_PROFILE', '저장 형식 오류')
            result = { values: validateProfile(saved.values, options, today()), updatedAt: saved.updatedAt ?? null }
            if (result.updatedAt !== null && !Number.isFinite(Date.parse(result.updatedAt))) throw error('INVALID_PROFILE', '저장 시각 오류')
          }
        } catch { persistent = false }
      }
      memory.set(id, result)
      return result
    }
    return Object.freeze({
      get persistent() { return services.mode === 'demo' && persistent },
      async load({ signal } = {}) {
        const captured = owner()
        let options, profile
        if (services.mode === 'demo') {
          options = localOptions()
          const saved = readDemo(captured, options)
          profile = demoResponse(saved.values, captured, saved.updatedAt)
        } else {
          const [choices, data] = await Promise.all([auth.request('/api/v1/me/options', { signal }), auth.request('/api/v1/me', { signal })])
          checkOwner(captured)
          options = optionsResponse(choices)
          profile = profileResponse(data, options, captured)
        }
        checkOwner(captured)
        cache = { captured, options, profile }
        return { options, profile }
      },
      async save(values, { signal } = {}) {
        const captured = owner()
        if (!cache || cache.captured !== captured) throw error('INVALID_PROFILE', '정보를 다시 불러온 후 저장해 주세요.')
        const validated = validateProfile(values, cache.options, cache.profile.reference_date)
        let profile
        if (services.mode === 'demo') {
          const updatedAt = new Date(now()).toISOString()
          const saved = { values: validated, updatedAt }
          memory.set(captured.user.id, saved)
          if (persistent) {
            try { storage.setItem(key(captured.user.id), JSON.stringify({ version: 1, ...saved })) } catch { persistent = false }
          }
          profile = demoResponse(validated, captured, updatedAt)
        } else {
          const response = await auth.request('/api/v1/me', { method: 'PATCH', json: validated, signal })
          checkOwner(captured)
          profile = profileResponse(response, cache.options, captured)
        }
        checkOwner(captured)
        cache.profile = profile
        return profile
      },
      async resetDemo() {
        const captured = owner()
        if (services.mode !== 'demo') throw error('INVALID_PROFILE', '시연 모드에서만 초기화할 수 있습니다.')
          try { (storage ?? global.localStorage)?.removeItem(key(captured.user.id)) } catch { throw error('DEMO_STORAGE_FAILED', '저장소 삭제 실패') }
        memory.set(captured.user.id, { values: empty(), updatedAt: null })
        return this.load()
      },
    })
  }
  function mountProfile(main, { profile, services, store }) {
    const scope = main.querySelector('.profile-page')
    const find = (name) => scope.querySelector(`[data-profile-${name}]`)
    const controller = new AbortController()
    const requestOptions = () => ({ signal: global.AbortSignal?.any && global.AbortSignal?.timeout
      ? global.AbortSignal.any([controller.signal, global.AbortSignal.timeout(15000)]) : controller.signal })
    const form = find('form')
    let data = null
    let options = null
    let busy = false
    let disposed = false
    find('email').textContent = store.getState().auth.user.email
    find('demo').hidden = services.mode !== 'demo'
    find('reset').hidden = services.mode !== 'demo'
    const message = (text, failed = false) => {
      find('feedback').textContent = text
      find('feedback').classList.toggle('form-message', failed)
      find('feedback').setAttribute('role', failed ? 'alert' : 'status')
    }
    function persistenceNote() {
      if (services.mode === 'demo') find('demo').textContent = profile.persistent
        ? '시연 정보입니다. 예시 정보를 입력해 주세요. 교통 정보는 이 브라우저의 시연 계정별로 저장되며, 초기화 버튼으로 삭제할 수 있습니다. 로그인은 새로고침 시 초기화됩니다.'
        : '시연 정보입니다. 예시 정보를 입력해 주세요. 브라우저 저장을 사용할 수 없어 현재 창에서만 유지되며 새로고침하면 초기화됩니다.'
    }
    function summary() {
      find('email').textContent = data.email
      const label = (name, codes) => codes.map((code) => options[name].find((choice) => choice.code === code)?.label ?? code).join(', ') || '등록하지 않음'
      find('birth').textContent = data.birth_date || '등록하지 않음'
      find('age').textContent = data.age === null ? '등록하지 않음' : `만 ${data.age}세 (${data.reference_date} 기준)`
      find('region').textContent = data.region_code ? label('regions', [data.region_code]) : '등록하지 않음'
      find('cards').textContent = label('transport_cards', data.transport_cards)
      find('modes').textContent = label('transport_modes', data.transport_modes)
      find('completeness').textContent = data.is_complete ? '입력 완료' : '추가 입력 가능'
      find('completeness').className = 'badge ' + (data.is_complete ? 'badge--blue' : 'badge--neutral')
      const names = { birth_date: '생년월일', region_code: '거주 지역', transport_cards: '교통카드', transport_modes: '이동 수단' }
      find('missing').textContent = data.missing_fields.length ? '아직 등록하지 않은 정보: ' + data.missing_fields.map((name) => names[name]).join(', ') : '교통 정보가 모두 등록되었습니다. 정책 적용 여부는 각 정책에서 확인해 주세요.'
      find('updated').textContent = data.updated_at ? '마지막 저장: ' + new Date(data.updated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' (한국 시간)' : '아직 저장한 교통 정보가 없습니다.'
      find('summary').hidden = false
      find('editor').hidden = true
      find('retry').hidden = true
      persistenceNote()
    }
    function setBusy(value) {
      busy = value
      form.querySelector('.profile-fields').disabled = value
      scope.setAttribute('aria-busy', String(value))
      for (const name of ['retry', 'edit', 'reset']) find(name).disabled = value
      find('save').textContent = value ? '처리 중…' : '저장하기'
    }
    function edit() {
      form.elements.birth_date.value = data.birth_date || ''
      form.elements.birth_date.max = data.reference_date
      const select = form.elements.region_code
      select.replaceChildren()
      for (const choice of [{ code: '', label: '선택하지 않음' }, ...options.regions]) {
        const item = document.createElement('option')
        item.value = choice.code
        item.textContent = choice.label
        select.append(item)
      }
      select.value = data.region_code || ''
      for (const [name, container] of [['transport_cards', 'card-choices'], ['transport_modes', 'mode-choices']]) {
        find(container).replaceChildren()
        for (const choice of options[name]) {
          const label = document.createElement('label')
          label.className = 'profile-choice'
          const input = document.createElement('input')
          input.type = 'checkbox'
          input.name = name
          input.value = choice.code
          input.checked = data[name].includes(choice.code)
          if (name === 'transport_cards') input.setAttribute('aria-describedby', 'profile-card-help')
          label.append(input, document.createTextNode(choice.label))
          find(container).append(label)
        }
      }
      message('입력 내용을 확인한 후 저장해 주세요.')
      find('summary').hidden = true
      find('editor').hidden = false
      scope.querySelector('#profile-edit-title').focus()
    }
    async function load() {
      if (busy || disposed) return
      setBusy(true)
      find('retry').hidden = true
      message('교통 정보를 불러오고 있어요.')
      try {
        const loaded = await profile.load(requestOptions())
        if (disposed) return
        data = loaded.profile
        options = loaded.options
        summary()
        message('교통 정보를 확인하고 수정할 수 있어요.')
      } catch (problem) {
        if (disposed) return
        message(profileMessage(problem), true)
        find('retry').hidden = false
      } finally { if (!disposed) setBusy(false) }
    }
    find('edit').addEventListener('click', edit)
    find('retry').addEventListener('click', () => { void load() })
    find('cancel').addEventListener('click', () => {
      summary()
      message('수정을 취소했습니다. 저장된 정보는 그대로 유지됩니다.')
      find('edit').focus()
    })
    form.addEventListener('change', (event) => {
      const target = event.target
      if (target.name !== 'transport_cards' || !target.checked) return
      for (const input of form.querySelectorAll('[name="transport_cards"]')) {
        if (input !== target && (target.value === 'other_or_none' || input.value === 'other_or_none')) input.checked = false
      }
    })
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (busy) return
      const values = {
        birth_date: form.elements.birth_date.value || null,
        region_code: form.elements.region_code.value || null,
        transport_cards: Array.from(form.querySelectorAll('[name="transport_cards"]:checked'), (input) => input.value),
        transport_modes: Array.from(form.querySelectorAll('[name="transport_modes"]:checked'), (input) => input.value),
      }
      setBusy(true)
      try {
        const saved = await profile.save(values, requestOptions())
        if (disposed) return
        data = saved
        summary()
        message('교통 정보를 저장했습니다.')
        if (global.BoSo.todos) {
          try { await global.BoSo.todos.sync(requestOptions()) }
          catch { if (!disposed) message('교통 정보는 저장했습니다. 할 일 갱신은 완료하지 못했으니 To-Do에서 다시 확인해 주세요.', true) }
        }
        find('feedback').focus()
      } catch (problem) {
        if (disposed) return
        message(profileMessage(problem) + ' 서버 응답을 받지 못했다면 다시 불러와 저장 여부를 확인할 수 있습니다.', true)
        find('retry').hidden = false
        find('feedback').focus()
      } finally { if (!disposed) setBusy(false) }
    })
    find('logout').addEventListener('click', () => document.getElementById('logout-button').click())
    find('reset').addEventListener('click', async () => {
      if (busy) return
      setBusy(true)
      try {
        const loaded = await profile.resetDemo()
        if (disposed) return
        data = loaded.profile
        options = loaded.options
        summary()
        message('이 시연 계정의 교통 정보를 초기화했습니다.')
        find('feedback').focus()
      } catch (problem) { if (!disposed) message(profileMessage(problem), true) } finally { if (!disposed) setBusy(false) }
    })
    // 로그인 완료 알림을 받은 직후에는 인증 작업의 마무리 다음에 조회한다.
    const start = global.setTimeout(() => { void load() }, 0)
    return () => { disposed = true; global.clearTimeout(start); controller.abort() }
  }

  Object.assign(global.BoSo, { createProfile, validateProfile, profileMessage, mountProfile })
})(globalThis)
