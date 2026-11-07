import type { IconName } from '../shared/ui/Icon'

export type NavigationItem = {
  path: string
  label: string
  icon: IconName
  description: string
}

export const navigationItems: NavigationItem[] = [
  { path: '/', label: '홈', icon: 'home', description: 'BoSo 서비스 안내' },
  { path: '/policies', label: '정책 변경', icon: 'policy', description: '흩어진 교통 정책과 변경사항을 한곳에서 확인해요.' },
  { path: '/todos', label: 'To-Do', icon: 'todo', description: '내 상황에 맞는 확인 목록과 해야 할 일을 관리해요.' },
  { path: '/chat', label: 'AI 챗봇', icon: 'chat', description: '교통카드와 정책에 대한 궁금증을 물어보세요.' },
  { path: '/profile', label: '내 정보', icon: 'profile', description: '맞춤 안내를 위한 내 정보를 관리해요.' },
]
