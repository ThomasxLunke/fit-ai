'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { useAuthDialog } from './auth-dialog-provider'
import type { CtaLink } from './cta'

// Renders a `CtaLink` as either a real navigation link (dashboard,
// onboarding) or a trigger that opens the auth dialog in place (sign-in,
// sign-up) — there's no standalone /sign-in or /sign-up page anymore.
export function CtaAction({
  link,
  className,
  style,
  children,
}: {
  link: CtaLink
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const { openAuthDialog } = useAuthDialog()

  if (link.href === '/sign-in' || link.href === '/sign-up') {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={() =>
          openAuthDialog(link.href === '/sign-up' ? 'sign-up' : 'sign-in')
        }
      >
        {children ?? link.label}
      </button>
    )
  }

  return (
    <Link className={className} style={style} href={link.href}>
      {children ?? link.label}
    </Link>
  )
}
