import type { ComponentPropsWithoutRef } from 'react'

export type IconName = 'home' | 'policy' | 'todo' | 'chat' | 'profile' | 'arrow' | 'info'

const paths: Record<IconName, string> = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  policy: 'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h4',
  todo: 'M9 5h12 M9 12h12 M9 19h12 M2 5l2 2 3-4 M2 12l2 2 3-4 M2 19l2 2 3-4',
  chat: 'M21 11a8 8 0 0 1-8 8H8l-5 3V11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z M8 10h8 M8 14h5',
  profile: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M4 21v-2a8 8 0 0 1 16 0v2',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  info: 'M12 11v6 M12 7v.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
}

export default function Icon({ name, ...props }: { name: IconName } & ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  )
}
