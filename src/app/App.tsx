import { Route, Routes } from 'react-router'
import HomePage from '../pages/home/HomePage'
import NotFoundPage from '../pages/not-found/NotFoundPage'
import ComingSoonPage from '../pages/coming-soon/ComingSoonPage'
import AppLayout from './layout/AppLayout'
import { navigationItems } from './navigation'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        {navigationItems.filter((item) => item.path !== '/').map((item) => (
          <Route key={item.path} path={item.path} element={
            <ComingSoonPage title={item.label} description={item.description} icon={item.icon} />
          } />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
