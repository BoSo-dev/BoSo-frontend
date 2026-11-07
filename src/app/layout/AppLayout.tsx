import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import Header from './Header'
import Footer from './Footer'
import { navigationItems } from '../navigation'

export default function AppLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)

  useEffect(() => {
    const page = navigationItems.find((item) => item.path === pathname)
    document.title = page ? `${page.label} | BoSo` : '페이지를 찾을 수 없습니다 | BoSo'
    if (previousPath.current !== pathname) {
      mainRef.current?.focus()
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <Header />
      <main ref={mainRef} id="main-content" className="main-content container" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
