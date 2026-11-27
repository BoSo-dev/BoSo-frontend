;(function () {
  'use strict'

  const main = document.getElementById('main-content')
  const routes = {
    home: { title: '홈' },
    todos: { title: 'To-Do', description: '내 상황에 맞는 확인 목록과 해야 할 일을 관리해요.' },
    policies: { title: '정책 변화', description: '흩어진 교통 정책과 변경사항을 한곳에서 확인해요.' },
    chat: { title: 'AI 챗봇', description: '교통카드와 정책에 대한 궁금증을 물어보세요.' },
    profile: { title: '내 정보', description: '맞춤 안내를 위한 내 정보를 관리해요.' },
    notifications: { title: '알림', description: '정책 변경과 해야 할 일을 확인해요.' },
  }

  try {
    const config = JSON.parse(document.getElementById('boso-config').textContent)
    const services = window.BoSo.createServices({ ...config, protocol: window.location.protocol })
    const store = window.BoSo.createStore({ route: null, mode: services.mode })
    // 기능 페이지가 공통 서비스와 상태를 재사용하는 연결 지점이다.
    window.BoSo.services = services
    window.BoSo.store = store
    document.getElementById('mode-label').textContent = services.mode === 'demo' ? '시연 모드' : '서버 연동 모드'
    document.getElementById('current-year').textContent = String(new Date().getFullYear())

    function render() {
      const hash = window.location.hash
      const key = hash === '#main-content' ? 'home' : hash.replace(/^#\//, '') || 'home'
      const route = Object.hasOwn(routes, key) ? routes[key] : undefined
      const previous = store.getState().route
      const template = document.getElementById(key === 'home' ? 'home-view' : 'placeholder-view')
      const content = template.content.cloneNode(true)
      if (key !== 'home') {
        content.querySelector('[data-heading]').textContent = route?.title ?? '페이지를 찾을 수 없습니다.'
        content.querySelector('[data-description]').textContent = route?.description ?? '주소를 다시 확인해 주세요.'
        if (!route) {
          content.querySelector('[data-empty-title]').textContent = '주소를 다시 확인해 주세요'
          content.querySelector('[data-empty-description]').textContent = '입력하신 주소가 변경되었거나 존재하지 않는 페이지예요.'
        }
      }
      main.replaceChildren(content)
      document.title = `${route?.title ?? '페이지를 찾을 수 없습니다'} | BoSo`
      for (const link of document.querySelectorAll('[data-route]')) {
        const active = link.dataset.route === key
        link.classList.toggle('nav-link--active', active)
        if (active) link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
      }
      store.setState({ route: key })
      if (previous !== null) {
        main.focus({ preventScroll: true })
        window.scrollTo(0, 0)
      }
    }

    document.querySelector('.skip-link').addEventListener('click', (event) => {
      event.preventDefault()
      main.focus()
      main.scrollIntoView()
    })
    window.addEventListener('hashchange', render)
    render()
  } catch {
    const heading = document.createElement('h1')
    heading.textContent = '실행 설정을 확인해 주세요.'
    main.replaceChildren(heading)
  }
})()
