'use client'

import React, { useState } from 'react'
import { z } from 'zod'
import { Button } from './ui/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Input } from './ui/input'
import { Check } from 'lucide-react'
import { updateUser } from '@/lib/api'
import { getUserBySessionAuth } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { generateProgram } from '@/lib/ai'

const formSchema = z.object({
  sessionPerWeek: z.number().min(1).max(7),
  dayAvailable: z.array(z.number().min(1).max(7)),
  objective: z.enum(['lose', 'gain', 'maintain']),
  programPreferences: z.enum([
    'push-pull-legs',
    'half-body',
    'full-body',
    'split',
    'none',
  ]),
})

export type OnBoardingSchema = z.infer<typeof formSchema>

export default function OnboardingForm() {
  const steps = [
    {
      name: 'Nombre de sessions par semaine',
      description: 'Combien de sessions par semaine voulez-vous faire ?',
      field: ['sessionPerWeek'],
    },
    {
      name: 'Jours disponibles',
      description: 'Quels jours de la semaine êtes-vous disponibles ?',
      field: ['dayAvailable'],
    },
    {
      name: 'Objectif',
      description: 'Quel est votre objectif ?',
      field: ['objective'],
    },
    {
      name: 'Préférences de programmation',
      description: 'Quelles sont vos préférences de programmation ?',
      field: ['programPreferences'],
    },
    {
      name: 'Onboarding terminé',
      description: 'Votre onboarding est terminé',
      field: [],
    },
  ]

  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sessionPerWeek: 1,
      dayAvailable: [],
      objective: undefined,
      programPreferences: undefined,
    },
  })

  const { setValue } = form

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const user = await getUserBySessionAuth()
    const updated = await updateUser(user.id, {
      ...user,
      onboarded: true,
    })
    console.log(updated)
    if (updated) {
      // router.push('/dashboard')
      const program = await generateProgram(form.getValues())
      console.log(program)
    }
  }

  const objectives = [
    { value: 'lose', label: 'Perdre du poids' },
    { value: 'gain', label: 'Prendre du muscle' },
    { value: 'maintain', label: 'Maintenir ma forme' },
  ]

  const programs = [
    { value: 'push-pull-legs', label: 'Push/Pull/Legs' },
    { value: 'half-body', label: 'Half Body' },
    { value: 'full-body', label: 'Full Body' },
    { value: 'split', label: 'Split' },
    { value: 'none', label: 'Aucune préférence' },
  ]

  const days = [
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' },
    { value: 7, label: 'Dimanche' },
  ]

  return (
    <div className="h-full w-full flex justify-center items-center">
      <div className="w-[600px] h-[500px] border rounded-lg p-4">
        <form
          className="w-full h-full flex flex-col justify-between"
          onSubmit={handleSubmit}
        >
          <div className="h-full flex flex-col justify-between">
            {currentStep === 0 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {steps[currentStep].name}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {steps[currentStep].description}
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  <Input
                    type="number"
                    placeholder="Nombre de sessions par semaine"
                    {...form.register('sessionPerWeek')}
                  />
                </div>
              </div>
            )}
            {currentStep === 1 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {steps[currentStep].name}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {steps[currentStep].description}
                  </p>
                </div>
                <div className="flex flex-col gap-4 flex-wrap">
                  {days.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={
                        form.watch('dayAvailable').includes(day.value)
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() =>
                        setValue(
                          'dayAvailable',
                          form.watch('dayAvailable').includes(day.value)
                            ? form
                                .watch('dayAvailable')
                                .filter((d) => d !== day.value)
                            : [...form.watch('dayAvailable'), day.value]
                        )
                      }
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {currentStep === 2 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {steps[currentStep].name}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {steps[currentStep].description}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {objectives.map((obj) => (
                    <Button
                      key={obj.value}
                      type="button"
                      variant={
                        form.watch('objective') === obj.value
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() =>
                        form.setValue(
                          'objective',
                          obj.value as 'lose' | 'gain' | 'maintain'
                        )
                      }
                      className="w-full"
                    >
                      {obj.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {currentStep === 3 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {steps[currentStep].name}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {steps[currentStep].description}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {programs.map((prog) => (
                    <Button
                      key={prog.value}
                      type="button"
                      variant={
                        form.watch('programPreferences') === prog.value
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() =>
                        form.setValue(
                          'programPreferences',
                          prog.value as
                            | 'push-pull-legs'
                            | 'half-body'
                            | 'full-body'
                            | 'split'
                            | 'none'
                        )
                      }
                      className="w-full"
                    >
                      {prog.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {currentStep === 4 && (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {steps[currentStep].name}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {steps[currentStep].description}
                  </p>
                </div>
                <Button type="submit">
                  <Check />
                  Valider
                </Button>
              </div>
            )}
          </div>
          {currentStep !== 4 && (
            <div className="flex justify-between">
              <Button
                disabled={currentStep === 0}
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Précédent
              </Button>
              <Button
                disabled={
                  currentStep === steps.length - 1 ||
                  (currentStep === 1 &&
                    form.watch('dayAvailable').length === 0) ||
                  (currentStep === 2 && !form.watch('objective')) ||
                  (currentStep === 3 && !form.watch('programPreferences'))
                }
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
