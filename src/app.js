;(function () {
  'use strict'

  const main = document.getElementById('main-content')
  const routes = {
    home: { title: '홈' },
    login: { title: '로그인' },
    signup: { title: '회원가입' },
    todos: { title: 'To-Do', description: '내 상황에 맞는 확인 목록과 해야 할 일을 관리해요.', protected: true },
    policies: { title: '정책 변화', description: '흩어진 교통 정책과 변경사항을 한곳에서 확인해요.' },
    chat: { title: 'AI 챗봇', description: '교통카드와 정책에 대한 궁금증을 물어보세요.', protected: true },
    profile: { title: '내 정보', description: '맞춤 안내를 위한 내 정보를 관리해요.', protected: true },
    notifications: { title: '알림', description: '정책 변경과 해야 할 일을 확인해요.', protected: true },
  }

  try {
    const config = JSON.parse(document.getElementById('boso-config').textContent)
    const services = window.BoSo.createServices({ ...config, protocol: window.location.protocol })
    const store = window.BoSo.createStore({ route: null, mode: services.mode, auth: { status: 'loading', user: null, error: null } })
    const auth = window.BoSo.createAuth({ services, store })
    const profile = window.BoSo.createProfile({ auth, services, store })
    Object.assign(window.BoSo, { services, store, auth, profile })
    const noticeElement = document.getElementById('session-notice')
    const logoutButton = document.getElementById('logout-button')
    let notice = ''
    let loggingOut = false
    let disposePage = () => {}
    document.getElementById('mode-label').textContent = services.mode === 'demo' ? '시연 모드' : '서버 연동 모드'
    document.getElementById('current-year').textContent = String(new Date().getFullYear())

    const navigate = (path) => window.location.replace('#/' + path)
    function currentRoute() {
      const hash = window.location.hash
      const [key, query = ''] = (hash === '#main-content' ? 'home' : hash.replace(/^#\//, '') || 'home').split('?')
      const requested = new URLSearchParams(query).get('next')
      const next = Object.hasOwn(routes, requested) && routes[requested].protected ? requested : 'profile'
      return { key, next }
    }
    function showNotice() {
      noticeElement.textContent = store.getState().auth.error || notice
      noticeElement.hidden = !noticeElement.textContent
    }
    function formError(form, error) {
      if (!form.isConnected) return
      const message = main.querySelector('[data-auth-message]')
      message.textContent = window.BoSo.authMessage(error)
      message.hidden = false
      message.tabIndex = -1
      message.focus()
    }
    function bindAuthForm(key, next) {
      const signup = key === 'signup'
      const form = main.querySelector('[data-auth-form]')
      const title = signup ? '회원가입' : '로그인'
      main.querySelector('[data-auth-title]').textContent = title
      main.querySelector('[data-auth-description]').textContent = signup
        ? '계정을 만들고 나에게 맞는 교통 혜택을 확인하세요.'
        : '다시 만나 반가워요. 나의 교통 생활을 이어가세요.'
      main.querySelector('[data-demo-note]').hidden = services.mode !== 'demo'
      main.querySelector('[data-confirm-field]').hidden = !signup
      form.elements.confirmation.required = signup
      form.elements.password.autocomplete = signup ? 'new-password' : 'current-password'
      main.querySelector('[data-auth-submit]').textContent = title
      main.querySelector('[data-switch-description]').textContent = signup ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'
      const switchLink = main.querySelector('[data-switch-link]')
      switchLink.textContent = signup ? '로그인' : '회원가입'
      switchLink.href = '#/' + (signup ? 'login' : 'signup') + '?next=' + encodeURIComponent(next)
      const demoButton = main.querySelector('[data-demo-login]')
      demoButton.hidden = services.mode !== 'demo' || signup
      const setBusy = (busy) => {
        form.querySelector('fieldset').disabled = busy
        form.setAttribute('aria-busy', String(busy))
        main.querySelector('[data-auth-submit]')?.replaceChildren(document.createTextNode(busy ? '처리 중…' : title))
      }
      form.addEventListener('submit', async (event) => {
        event.preventDefault()
        const email = form.elements.email.value
        const password = form.elements.password.value
        const confirmation = form.elements.confirmation.value
        main.querySelector('[data-auth-message]').hidden = true
        setBusy(true)
        try {
          if (signup) {
            await auth.signup(email, password, confirmation)
            notice = '회원가입이 완료되었습니다. 로그인해 주세요.'
            if (form.isConnected) navigate('login?next=' + encodeURIComponent(next))
          } else {
            await auth.login(email, password)
            notice = '로그인했습니다.'
          }
          showNotice()
        } catch (error) { formError(form, error) } finally {
          // 비밀번호는 화면 이동과 실패 후에도 DOM에 남기지 않는다.
          form.elements.password.value = ''
          form.elements.confirmation.value = ''
          if (form.isConnected) setBusy(false)
        }
      })
      demoButton.addEventListener('click', async () => {
        setBusy(true)
        try { await auth.enterDemo() } catch (error) { formError(form, error) } finally {
          if (form.isConnected) setBusy(false)
        }
      })
    }

    function render() {
      const { key, next } = currentRoute()
      const route = Object.hasOwn(routes, key) ? routes[key] : undefined
      const state = store.getState().auth
      const authenticated = state.status === 'authenticated'
      const loading = state.status === 'loading'
      const member = document.querySelector('.member-link')
      member.href = authenticated ? '#/profile' : '#/login'
      member.querySelector('[data-member-label]').textContent = authenticated ? '내 정보' : '로그인'
      logoutButton.hidden = !authenticated
      logoutButton.disabled = loggingOut
      showNotice()
      if (route?.protected && state.status === 'anonymous') {
        navigate('login?next=' + encodeURIComponent(key))
        return
      }
      if (authenticated && (key === 'login' || key === 'signup')) {
        navigate(next)
        return
      }
      const blocked = (route?.protected && !authenticated) || ((key === 'login' || key === 'signup') && loading)
      const template = blocked ? 'session-view' : key === 'login' || key === 'signup' ? 'auth-view' : key === 'profile' ? 'profile-view' : key === 'home' ? 'home-view' : 'placeholder-view'
      const previous = store.getState().route
      disposePage()
      disposePage = () => {}
      main.replaceChildren(document.getElementById(template).content.cloneNode(true))
      if (blocked && !loading) {
        main.querySelector('[data-session-title]').textContent = '로그인 정보를 확인할 수 없어요'
        main.querySelector('[data-session-description]').textContent = '서버 연결을 다시 시도하거나 로그인해 주세요.'
        main.querySelector('[data-session-actions]').hidden = false
        main.querySelector('[data-retry-session]').addEventListener('click', () => { void auth.initialize() })
        main.querySelector('.session-actions a').href = '#/login?next=' + encodeURIComponent(key)
      } else if (template === 'auth-view') bindAuthForm(key, next)
      else if (template === 'profile-view') disposePage = window.BoSo.mountProfile(main, { profile, services, store })
      else if (template === 'placeholder-view') {
        main.querySelector('[data-heading]').textContent = route?.title ?? '페이지를 찾을 수 없습니다.'
        main.querySelector('[data-description]').textContent = route?.description ?? '주소를 다시 확인해 주세요.'
        if (!route) {
          main.querySelector('[data-empty-title]').textContent = '주소를 다시 확인해 주세요'
          main.querySelector('[data-empty-description]').textContent = '입력하신 주소가 변경되었거나 존재하지 않는 페이지예요.'
        }
      }
      document.title = `${route?.title ?? '페이지를 찾을 수 없습니다'} | BoSo`
      for (const link of document.querySelectorAll('[data-route]')) {
        const active = link.dataset.route === key || (link === member && ['login', 'signup'].includes(key))
        link.classList.toggle('nav-link--active', active)
        if (active) link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
      }
      if (previous !== key) store.setState({ route: key })
      if (previous !== null) {
        main.focus({ preventScroll: true })
        window.scrollTo(0, 0)
      }
    }

    logoutButton.addEventListener('click', async () => {
      loggingOut = true
      logoutButton.disabled = true
      try {
        await auth.logout()
        notice = '로그아웃했습니다.'
        navigate('home')
      } catch (error) { notice = window.BoSo.authMessage(error) } finally {
        loggingOut = false
        logoutButton.disabled = false
        showNotice()
      }
    })
    let previousAuth = store.getState().auth
    store.subscribe((state) => {
      if (state.auth === previousAuth) return
      previousAuth = state.auth
      render()
    })
    document.querySelector('.skip-link').addEventListener('click', (event) => {
      event.preventDefault()
      main.focus()
      main.scrollIntoView()
    })
    window.addEventListener('hashchange', render)
    render()
    void auth.initialize()
  } catch {
    const heading = document.createElement('h1')
    heading.textContent = '실행 설정을 확인해 주세요.'
    main.replaceChildren(heading)
  }
})()
