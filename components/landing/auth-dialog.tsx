'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { landingFontVariables } from './fonts'

export type AuthMode = 'sign-in' | 'sign-up'

export function AuthDialog({
  mode,
  onModeChange,
  open,
  onOpenChange,
}: {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const reset = () => {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setIsLoading(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const switchMode = (next: AuthMode) => {
    setError('')
    onModeChange(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'sign-up' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setIsLoading(true)

    const onSuccess = () => {
      handleOpenChange(false)
      // router.push('/dashboard')
      router.refresh()
    }
    const onError = (ctx: { error: { message: string } }) => {
      setIsLoading(false)
      setError(ctx.error.message)
    }

    if (mode === 'sign-up') {
      await authClient.signUp.email(
        { email, password, name },
        { onSuccess, onError },
      )
    } else {
      await authClient.signIn.email({ email, password }, { onSuccess, onError })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`landing-scope ${landingFontVariables} lg-panel bg-card p-8 sm:max-w-md`}
      >
        <span className="lg-br" aria-hidden="true" />
        <DialogHeader>
          <div className="lg-eyebrow">authentification</div>
          <DialogTitle>
            {mode === 'sign-up' ? 'Créer un compte' : 'Se connecter'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'sign-up'
              ? 'Créez votre compte pour mesurer vos segments et générer votre programme.'
              : 'Connectez-vous pour retrouver votre programme.'}
          </DialogDescription>
        </DialogHeader>

        <div className="lg-auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="lg-auth-tab"
            data-active={mode === 'sign-in'}
            aria-selected={mode === 'sign-in'}
            onClick={() => switchMode('sign-in')}
          >
            Connexion
          </button>
          <button
            type="button"
            role="tab"
            className="lg-auth-tab"
            data-active={mode === 'sign-up'}
            aria-selected={mode === 'sign-up'}
            onClick={() => switchMode('sign-up')}
          >
            Inscription
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="lg-field">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="m@example.com"
            />
          </div>
          {mode === 'sign-up' && (
            <div className="lg-field">
              <Label htmlFor="auth-name">Nom</Label>
              <Input
                id="auth-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>
          )}

          <div className="lg-field">
            <Label htmlFor="auth-password">Mot de passe</Label>
            <Input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>
          {mode === 'sign-up' && (
            <div className="lg-field">
              <Label htmlFor="auth-confirm">Confirmer le mot de passe</Label>
              <Input
                id="auth-confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
              />
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading && <Loader2Icon className="animate-spin" />}
            {mode === 'sign-up' ? "S'inscrire" : 'Se connecter'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
