import { CircleAlertIcon, LoaderCircleIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/auth/auth-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Mode = 'login' | 'register'

export function AuthDialog() {
  const { authOpen, setAuthOpen, login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    setPending(true)
    setError(null)
    try {
      if (mode === 'login') await login(email, password)
      else await register(String(form.get('username') ?? ''), email, password)
      setAuthOpen(false)
      toast.success(mode === 'login' ? '¡Hola de nuevo!' : 'Cuenta creada. ¡Bienvenido a SoftMusic!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos completar la operación.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={authOpen}
      onOpenChange={open => {
        setAuthOpen(open)
        if (!open) setError(null)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</DialogTitle>
          <DialogDescription>Guarda tu música y recibe recomendaciones hechas para ti.</DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={v => {
            setMode(v as Mode)
            setError(null)
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register">Crear cuenta</TabsTrigger>
          </TabsList>

          {(['login', 'register'] as const).map(m => (
            <TabsContent key={m} value={m}>
              <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-4">
                {error && (
                  <Alert variant="destructive" aria-live="polite">
                    <CircleAlertIcon />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {m === 'register' && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="username">Nombre de usuario</Label>
                    <Input id="username" name="username" autoComplete="username" required minLength={2} maxLength={40} />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${m}-email`}>Correo electrónico</Label>
                  <Input id={`${m}-email`} name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${m}-password`}>Contraseña</Label>
                  <Input
                    id={`${m}-password`}
                    name="password"
                    type="password"
                    autoComplete={m === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                    aria-describedby={m === 'register' ? 'password-hint' : undefined}
                  />
                  {m === 'register' && (
                    <p id="password-hint" className="text-xs text-muted-foreground">
                      Mínimo 6 caracteres.
                    </p>
                  )}
                </div>
                <Button type="submit" size="lg" disabled={pending} className="mt-1">
                  {pending && <LoaderCircleIcon className="animate-spin" />}
                  {m === 'login' ? 'Entrar' : 'Crear cuenta'}
                </Button>
              </form>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
