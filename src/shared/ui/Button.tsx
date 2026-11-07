import type { ComponentPropsWithoutRef } from 'react'
import { Link } from 'react-router'
import type { LinkProps } from 'react-router'

type Variant = 'primary' | 'secondary' | 'subtle'

function buttonClass(variant: Variant, className?: string) {
  return ['button', `button--${variant}`, className].filter(Boolean).join(' ')
}

export function Button({ variant = 'primary', className, type = 'button', ...props }:
  ComponentPropsWithoutRef<'button'> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />
}

export function LinkButton({ variant = 'primary', className, ...props }:
  Omit<LinkProps, 'className'> & { variant?: Variant; className?: string }) {
  return <Link className={buttonClass(variant, className)} {...props} />
}
