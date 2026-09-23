import { useState } from 'react'
import { AddressPicker } from '@/components/profile/AddressPicker'
import { ReminderPlanner } from '@/components/profile/ReminderPlanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { setSetting, type AppSettings } from '@/db'

export function ProfileCard({ settings }: { settings: AppSettings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Cómo te llamamos y cómo te hablamos dentro de la app.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* key: si el nombre cambia desde fuera (p. ej. restaurar backup), el campo se reinicia */}
        <NameField key={settings.displayName} initial={settings.displayName} />
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold">Trato</span>
          <AddressPicker value={settings.addressForm} onChange={(v) => setSetting('addressForm', v)} />
        </div>
      </CardContent>
    </Card>
  )
}

function NameField({ initial }: { initial: string }) {
  const [name, setName] = useState(initial)
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-semibold">Nombre o apodo</span>
      <Input
        value={name}
        maxLength={40}
        placeholder="Sin nombre"
        autoComplete="given-name"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setSetting('displayName', name.trim())}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        enterKeyHint="done"
      />
    </label>
  )
}

export function RemindersCard({ settings }: { settings: AppSettings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recordatorios</CardTitle>
        <CardDescription>Tu calendario te avisa los días de entreno, aunque la app esté cerrada.</CardDescription>
      </CardHeader>
      <CardContent>
        <ReminderPlanner
          days={settings.trainingDays}
          time={settings.reminderTime}
          onChange={({ days, time }) => {
            void setSetting('trainingDays', days)
            void setSetting('reminderTime', time)
          }}
        />
      </CardContent>
    </Card>
  )
}

export function ReplayWelcomeButton() {
  return (
    <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setSetting('onboarded', false)}>
      Ver la bienvenida otra vez
    </Button>
  )
}
