'use client'

import React, { useState } from 'react'
import { z } from 'zod'
import { Button } from './ui/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

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

export default function OnboardingForm() {
  const steps = [
    {
      name: 'Session per week',
      description: 'How many sessions per week do you want to do?',
      field: ['sessionPerWeek'],
    },
    {
      name: 'Day available',
      description: 'What days of the week are you available?',
      field: ['dayAvailable'],
    },
    {
      name: 'Objective',
      description: 'What is your objective?',
      field: ['objective'],
    },
    {
      name: 'Program preferences',
      description: 'What is your program preferences?',
      field: ['programPreferences'],
    },
    {
      name: 'Onboarding complete',
      description: 'Your onboarding is complete',
      field: [],
    },
  ]

  const [currentStep, setCurrentStep] = useState(0)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sessionPerWeek: 0,
      dayAvailable: [],
      objective: undefined,
      programPreferences: undefined,
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCurrentStep(currentStep + 1)
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

  return (
    <div className="h-full w-full flex justify-center items-center">
      <div className="w-[600px] h-[500px] border rounded-lg p-4">
        <form
          className="w-full h-full flex flex-col justify-between"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col justify-between">
            {currentStep === 0 && (
              <div>
                <h1>{steps[currentStep].name}</h1>
                <p>{steps[currentStep].description}</p>
              </div>
            )}
            {currentStep === 1 && (
              <div>
                <h1>{steps[currentStep].name}</h1>
                <p>{steps[currentStep].description}</p>
              </div>
            )}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h1>{steps[currentStep].name}</h1>
                <p>{steps[currentStep].description}</p>
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
              <div className="space-y-4">
                <h1>{steps[currentStep].name}</h1>
                <p>{steps[currentStep].description}</p>
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
              <div>
                <h1>{steps[currentStep].name}</h1>
                <p>{steps[currentStep].description}</p>
              </div>
            )}
          </div>
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
                (currentStep === 2 && !form.watch('objective')) ||
                (currentStep === 3 && !form.watch('programPreferences'))
              }
              type="submit"
            >
              Suivant
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
