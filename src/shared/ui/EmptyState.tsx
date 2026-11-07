import type { ReactNode } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

export default function EmptyState({ title, description, icon = 'info', action }:
  { title: string; description: string; icon?: IconName; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Icon name={icon} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}
