'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { AuthDialog, type AuthMode } from './auth-dialog'

type AuthDialogContextValue = {
  openAuthDialog: (mode: AuthMode) => void
}

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null)

export function useAuthDialog() {
  const ctx = useContext(AuthDialogContext)
  if (!ctx) {
    throw new Error('useAuthDialog must be used within an AuthDialogProvider')
  }
  return ctx
}

export function AuthDialogProvider({
  children,
  initialMode,
}: {
  children: ReactNode
  /** Auto-opens the dialog on mount — used when middleware redirects a
   * signed-out visitor back to `/?auth=sign-in` instead of a dedicated page. */
  initialMode?: AuthMode
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode ?? 'sign-in')
  const [open, setOpen] = useState(Boolean(initialMode))

  return (
    <AuthDialogContext.Provider
      value={{
        openAuthDialog: (nextMode) => {
          setMode(nextMode)
          setOpen(true)
        },
      }}
    >
      {children}
      <AuthDialog mode={mode} onModeChange={setMode} open={open} onOpenChange={setOpen} />
    </AuthDialogContext.Provider>
  )
}
