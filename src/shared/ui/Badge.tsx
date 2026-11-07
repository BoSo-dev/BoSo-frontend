import type { ComponentPropsWithoutRef } from 'react'

export default function Badge({ tone = 'blue', className = '', ...props }:
  ComponentPropsWithoutRef<'span'> & { tone?: 'blue' | 'neutral' | 'warm' }) {
  return <span className={`badge badge--${tone} ${className}`} {...props} />
}
