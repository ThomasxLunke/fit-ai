'use client'

import React, { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from './ui/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Input } from './ui/input'
import { Check } from 'lucide-react'
import { createProgramOnBoarding, updateUser } from '@/lib/api'
import { getUserBySessionAuth } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { generateProgram } from '@/lib/ai'
import Webcam from 'react-webcam'
import * as bodyPix from '@tensorflow-models/body-pix'
import '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import '@mediapipe/selfie_segmentation'
import { average, getAverageDistance, getDistance } from '@/lib/utils'

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
  arm: z.number().min(0).max(2),
  leg: z.number().min(0).max(2),
  torso: z.number().min(0).max(2),
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
      name: 'Mesure du bras',
      description: 'Quelle est la mesure de votre bras ?',
      field: ['humerusToRadius'],
    },
    {
      name: 'Mesure de la cuisse',
      description: 'Quelle est la mesure de votre cuisse ?',
      field: ['femurToTibia'],
    },
    {
      name: 'Mesure de la longueur du torse',
      description: 'Quelle est la mesure de votre longueur du torse ?',
      field: ['torsoToLegs'],
    },
    {
      name: 'Onboarding terminé',
      description: 'Votre onboarding est terminé',
      field: [],
    },
  ]

  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [measurementArm, setMeasurementArm] = useState<number[]>([])
  const [measurementLeg, setMeasurementLeg] = useState<number[]>([])
  const [measurementTorso, setMeasurementTorso] = useState<number[]>([])

  const detect = async (
    model: bodyPix.BodyPix,
    pushMeasurement: (val: number) => void
  ) => {
    if (
      typeof webcamRef.current !== 'undefined' &&
      webcamRef.current !== null &&
      webcamRef.current.video?.readyState === 4 &&
      canvasRef.current
    ) {
      const video = webcamRef.current.video
      const videoWidth = webcamRef.current.video.videoWidth
      const videoHeight = webcamRef.current.video.videoHeight

      webcamRef.current.video.width = videoWidth
      webcamRef.current.video.height = videoHeight

      canvasRef.current.width = videoWidth
      canvasRef.current.height = videoHeight

      const partSegmentation = await model.segmentPersonParts(video, {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.8,
      })

      const canvas = canvasRef.current
      if (model && canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx)
          partSegmentation?.allPoses[0]?.keypoints.map((pos) => {
            ctx.fillStyle = 'red'
            ctx.fillRect(pos.position.x, pos.position.y, 5, 5)
          })

        if (partSegmentation?.allPoses[0]?.keypoints) {
          const keypoints = partSegmentation.allPoses[0].keypoints
          const parts = keypoints.map((key) => key.part)

          if (
            currentStep === 4 &&
            ['leftShoulder', 'leftElbow', 'leftWrist'].every((v) =>
              parts.includes(v)
            )
          ) {
            const leftShoulder = keypoints.find(
              (k) => k.part === 'leftShoulder'
            )
            const leftElbow = keypoints.find((k) => k.part === 'leftElbow')
            const leftWrist = keypoints.find((k) => k.part === 'leftWrist')
            if (
              leftShoulder!.score > 0.9 &&
              leftElbow!.score > 0.9 &&
              leftWrist!.score > 0.9
            ) {
              const firstDistance = getDistance(
                leftShoulder!.position.x,
                leftShoulder!.position.y,
                leftElbow!.position.x,
                leftElbow!.position.y
              )
              const secondDistance = getDistance(
                leftWrist!.position.x,
                leftWrist!.position.y,
                leftElbow!.position.x,
                leftElbow!.position.y
              )
              const ratio = firstDistance / secondDistance
              pushMeasurement(ratio)
            }
          }

          if (
            currentStep === 5 &&
            [
              'leftHip',
              'leftKnee',
              'leftAnkle',
              'rightHip',
              'rightKnee',
              'rightAnkle',
            ].every((v) => parts.includes(v))
          ) {
            const leftHip = keypoints.find((k) => k.part === 'leftHip')
            const leftKnee = keypoints.find((k) => k.part === 'leftKnee')
            const leftAnkle = keypoints.find((k) => k.part === 'leftAnkle')
            const rightHip = keypoints.find((k) => k.part === 'rightHip')
            const rightKnee = keypoints.find((k) => k.part === 'rightKnee')
            const rightAnkle = keypoints.find((k) => k.part === 'rightAnkle')

            if (
              leftHip!.score > 0.7 &&
              leftKnee!.score > 0.7 &&
              leftAnkle!.score > 0.7 &&
              rightHip!.score > 0.7 &&
              rightKnee!.score > 0.7 &&
              rightAnkle!.score > 0.7
            ) {
              console.log('iccii')
              const leftLeg =
                getAverageDistance(leftHip!.position, leftKnee!.position) +
                getAverageDistance(leftKnee!.position, leftAnkle!.position)
              const rightLeg =
                getAverageDistance(rightHip!.position, rightKnee!.position) +
                getAverageDistance(rightKnee!.position, rightAnkle!.position)
              const ratio = (leftLeg + rightLeg) / 2
              pushMeasurement(ratio) // ← On push ici
            }
          }

          if (
            currentStep === 6 &&
            ['leftShoulder', 'leftHip', 'rightShoulder', 'rightHip'].every(
              (v) => parts.includes(v)
            )
          ) {
            const leftShoulder = keypoints.find(
              (k) => k.part === 'leftShoulder'
            )
            const leftHip = keypoints.find((k) => k.part === 'leftHip')
            const rightShoulder = keypoints.find(
              (k) => k.part === 'rightShoulder'
            )
            const rightHip = keypoints.find((k) => k.part === 'rightHip')

            if (
              leftShoulder!.score > 0.9 &&
              leftHip!.score > 0.9 &&
              rightShoulder!.score > 0.9 &&
              rightHip!.score > 0.9
            ) {
              const leftTorso = getAverageDistance(
                leftShoulder!.position,
                leftHip!.position
              )
              const rightTorso = getAverageDistance(
                rightShoulder!.position,
                rightHip!.position
              )
              const ratio = (leftTorso + rightTorso) / 2
              pushMeasurement(ratio)
            }
          }
        }
      }
    }
  }

  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)
  const modelRef = useRef<bodyPix.BodyPix | null>(null)

  const loadModel = async () => {
    if (!modelRef.current) modelRef.current = await bodyPix.load()
  }

  const runBodysegment = async () => {
    await loadModel()
    intervalIdRef.current = setInterval(async () => {
      if (modelRef.current) {
        const tempArm = []
        const tempLeg = []
        const tempTorso = []
        await detect(modelRef.current, (ratio: number) => {
          if (currentStep === 4 && tempArm.length < 100) {
            tempArm.push(ratio)
            setMeasurementArm((prev) => [...prev, ratio])
          }

          if (currentStep === 5 && tempLeg.length < 100) {
            tempLeg.push(ratio)
            setMeasurementLeg((prev) => [...prev, ratio])
          }
          if (currentStep === 6 && tempTorso.length < 100) {
            tempTorso.push(ratio)
            setMeasurementTorso((prev) => [...prev, ratio])
          }
        })
      }
    }, 100)
  }
  useEffect(() => {
    if (
      (currentStep === 4 || currentStep === 5 || currentStep === 6) &&
      webcamRef.current &&
      canvasRef.current
    ) {
      runBodysegment()
    } else {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }
    }
  }, [currentStep])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sessionPerWeek: 1,
      dayAvailable: [],
      objective: undefined,
      programPreferences: undefined,
      arm: 0,
      leg: 0,
      torso: 0,
    },
  })

  const { setValue } = form

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const user = await getUserBySessionAuth()
    const program = await generateProgram({
      ...form.getValues(),
      arm: average(measurementArm),
      leg: average(measurementLeg),
      torso: average(measurementTorso),
    })
    const createProgram = await createProgramOnBoarding(user.id, program)
    const updated = await updateUser(user.id, {
      ...user,
      onboarded: true,
    })
    console.log(updated)
    if (updated && createProgram) {
      router.push('/dashboard')
      form.getValues().arm = average(measurementArm)
      form.getValues().leg = average(measurementLeg)
      form.getValues().torso = average(measurementTorso)
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
            {[4, 5, 6].includes(currentStep) && (
              <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold tracking-tight">
                  {steps[currentStep].name}
                </h1>
                <p className="text-base text-muted-foreground">
                  {steps[currentStep].description}
                </p>
                {currentStep === 4 && (
                  <p className="text-green-500 text-base">
                    {measurementArm.length} / 100
                  </p>
                )}
                {currentStep === 5 && (
                  <p className="text-green-500 text-base">
                    {measurementLeg.length} / 100
                  </p>
                )}
                {currentStep === 6 && (
                  <p className="text-green-500 text-base">
                    {measurementTorso.length} / 100
                  </p>
                )}

                <div className="flex w-full h-fit flex-col justify-center items-center">
                  <Webcam
                    id="webcam"
                    ref={webcamRef}
                    style={{
                      width: 320,
                      height: 240,
                      position: 'relative',
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: 320,
                      height: 240,
                      position: 'absolute',
                      top: '39.5%',
                    }}
                  />
                </div>
              </div>
            )}
            {currentStep === 7 && (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {steps[currentStep].name}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {steps[currentStep].description}
                  </p>
                </div>
                <div className="flex justify-between">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Précédent
                  </Button>
                  <Button type="submit">
                    <Check />
                    Valider
                  </Button>
                </div>
              </div>
            )}
          </div>

          {currentStep !== 7 && (
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
                  (currentStep === 3 && !form.watch('programPreferences')) ||
                  (currentStep === 4 && measurementArm.length < 100) ||
                  (currentStep === 5 && measurementLeg.length < 100) ||
                  (currentStep === 6 && measurementTorso.length < 100)
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
