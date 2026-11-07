import { Link, NavLink } from 'react-router'
import logo from '../../shared/assets/boso-logo.png'
import Badge from '../../shared/ui/Badge'
import { navigationItems } from '../navigation'

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link className="brand" to="/" aria-label="BoSo 홈">
          <img src={logo} alt="" width="48" height="48" />
          <span>BoSo</span>
        </Link>
        <nav className="primary-nav" aria-label="주요 메뉴">
          {navigationItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Badge tone="warm" className="header-status">서비스 준비 중</Badge>
      </div>
    </header>
  )
}
