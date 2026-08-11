'use client'

import React, { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from './ui/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Input } from './ui/input'
import { Check, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Webcam from 'react-webcam'
import * as bodyPix from '@tensorflow-models/body-pix'
import '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import '@mediapipe/selfie_segmentation'
import { average, getAverageDistance, getDistance } from '@/lib/utils'
import { StepProgress } from '@/components/onboarding/step-progress'
import { CameraPanel } from '@/components/onboarding/camera-panel'
import { PoseGuide, type PoseHighlight } from '@/components/onboarding/pose-guide'
import { DevFillMeasurementButton } from '@/components/onboarding/dev-fill-measurement-button'

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
      name: 'Mesure du bras gauche',
      description:
        'Positionnez votre bras gauche à angle droit devant vous, comme sur le schéma, et présentez-le à la caméra.',
      field: ['humerusToRadius'],
    },
    {
      name: 'Mesure des jambes',
      description:
        'Reculez-vous pour que vos deux jambes soient visibles en entier, debout et face à la caméra.',
      field: ['femurToTibia'],
    },
    {
      name: 'Mesure du buste',
      description:
        'Restez dans la même position, bras relâchés le long du corps, face à la caméra.',
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // The actual generation (generateProgram + persistence) no longer runs
    // here — it's kicked off by ProgramGenerationLoader once we land on
    // /dashboard, so "Valider" navigates immediately instead of leaving the
    // user waiting on this last wizard screen. The payload travels via
    // sessionStorage since it won't fit cleanly in a URL.
    const payload: OnBoardingSchema = {
      ...form.getValues(),
      arm: average(measurementArm),
      leg: average(measurementLeg),
      torso: average(measurementTorso),
    }
    sessionStorage.setItem('fitai:onboarding-payload', JSON.stringify(payload))
    router.push('/dashboard?generating=1')
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

  const poseHighlight: PoseHighlight =
    currentStep === 4 ? 'left-arm' : currentStep === 5 ? 'legs' : 'torso'
  const measuredSegmentLabel =
    currentStep === 4
      ? 'bras gauche'
      : currentStep === 5
        ? 'jambes (gauche + droite)'
        : 'buste (gauche + droite)'
  const sampleCount =
    currentStep === 4
      ? measurementArm.length
      : currentStep === 5
        ? measurementLeg.length
        : measurementTorso.length

  // Dev-only — see components/onboarding/dev-fill-measurement-button.tsx.
  // Values approximate what detect() actually produces: a true ratio for
  // the arm (~0.9-1.0), raw pixel distances for legs/torso (their
  // magnitude depends on camera resolution/distance, not a 0-2 ratio).
  const fillFakeMeasurement = () => {
    const fakeSamples = (base: number, spread: number) =>
      Array.from({ length: 100 }, () => base + (Math.random() - 0.5) * spread)

    if (currentStep === 4) setMeasurementArm(fakeSamples(0.95, 0.1))
    if (currentStep === 5) setMeasurementLeg(fakeSamples(300, 20))
    if (currentStep === 6) setMeasurementTorso(fakeSamples(150, 15))
  }

  const isNextDisabled =
    currentStep === steps.length - 1 ||
    (currentStep === 1 && form.watch('dayAvailable').length === 0) ||
    (currentStep === 2 && !form.watch('objective')) ||
    (currentStep === 3 && !form.watch('programPreferences')) ||
    (currentStep === 4 && measurementArm.length < 100) ||
    (currentStep === 5 && measurementLeg.length < 100) ||
    (currentStep === 6 && measurementTorso.length < 100)

  // Steps 0-6 have no <button type="submit"> in the DOM (it only renders on
  // step 7), but a form with a single text input still submits implicitly on
  // Enter per the HTML spec — which was skipping straight to program
  // generation with whatever partial values happened to be in the form.
  // Redirect Enter to "advance a step" everywhere except the last one.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || currentStep === 7) return
    e.preventDefault()
    if (!isNextDisabled) setCurrentStep((step) => step + 1)
  }

  return (
    <div className="lg-wrap">
      <StepProgress current={currentStep} total={steps.length} />

      <div className="lg-panel lg-wizard-shell">
        <span className="lg-br" />
        <form
          className="flex flex-col gap-8"
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
        >
          <div className="flex flex-col gap-8">
            {currentStep === 0 && (
              <div className="flex flex-col gap-4">
                <div className="lg-step-head">
                  <h1 className="text-3xl">{steps[currentStep].name}</h1>
                  <p>{steps[currentStep].description}</p>
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
                <div className="lg-step-head">
                  <h1 className="text-3xl">{steps[currentStep].name}</h1>
                  <p>{steps[currentStep].description}</p>
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
                <div className="lg-step-head">
                  <h1 className="text-3xl">{steps[currentStep].name}</h1>
                  <p>{steps[currentStep].description}</p>
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
                <div className="lg-step-head">
                  <h1 className="text-3xl">{steps[currentStep].name}</h1>
                  <p>{steps[currentStep].description}</p>
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
                <div className="lg-step-head">
                  <div className="lg-eyebrow">mesure_caméra</div>
                  <h2>{steps[currentStep].name}</h2>
                  <p>{steps[currentStep].description}</p>
                </div>

                <div className="lg-camera-guide-row">
                  <CameraPanel
                    webcamRef={webcamRef}
                    canvasRef={canvasRef}
                    sampleCount={sampleCount}
                  />
                  <div className="lg-panel lg-pose-panel">
                    <span className="lg-br" />
                    <div className="lg-camera-head">
                      <span className="lg-mono">POSE_GUIDE.RÉFÉRENCE</span>
                    </div>
                    <div className="lg-guide-stage">
                      <PoseGuide highlight={poseHighlight} />
                    </div>
                    <div className="lg-pose-label lg-mono">
                      Segment mesuré&nbsp;: <b>{measuredSegmentLabel}</b>
                    </div>
                  </div>
                </div>

                <div className="lg-trust-line">
                  <Lock className="h-3.5 w-3.5" />
                  Aucune image ni vidéo n&apos;est enregistrée ou envoyée à un
                  serveur — le traitement s&apos;exécute entièrement dans
                  votre navigateur, seuls les ratios calculés (des nombres)
                  sont conservés.
                </div>

                <DevFillMeasurementButton onFill={fillFakeMeasurement} />
              </div>
            )}
            {currentStep === 7 && (
              <div className="flex flex-col gap-4">
                <div className="lg-step-head">
                  <h1 className="text-3xl">{steps[currentStep].name}</h1>
                  <p>{steps[currentStep].description}</p>
                </div>
                <div className="lg-wizard-actions">
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
            <div className="lg-wizard-actions">
              <Button
                disabled={currentStep === 0}
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Précédent
              </Button>
              <Button
                disabled={isNextDisabled}
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
