'use client'

import { useState, type RefObject } from 'react'
import Webcam from 'react-webcam'

// Overlays <Webcam> and <canvas> via `position: absolute; inset: 0` inside a
// box sized to the camera's real aspect ratio (measured once from the video
// element itself) instead of the previous hand-tuned per-step `top` percent
// hack — that hack existed because the canvas's internal pixel buffer is set
// to the video's native resolution (see detect() in onboarding-form.tsx)
// while both were displayed at a fixed 320x240 box, an aspect mismatch that
// drifted differently depending on the camera's actual native ratio.
//
// This component only manages presentation (refs + sizing) — the BodyPix
// pixel math in onboarding-form.tsx's detect() reads canvas.width/height in
// the canvas's own native coordinate space and is completely unaffected by
// how big the box is drawn on screen.
export function CameraPanel({
  webcamRef,
  canvasRef,
  sampleCount,
  sampleTarget = 100,
}: {
  webcamRef: RefObject<Webcam | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  sampleCount: number
  sampleTarget?: number
}) {
  const [aspectRatio, setAspectRatio] = useState(4 / 3)

  return (
    <div className="lg-panel lg-camera-panel">
      <span className="lg-br" />
      <div className="lg-camera-head">
        <span className="lg-mono">WEBCAM.FEED</span>
        <span className="lg-camera-rec lg-mono">LIVE</span>
      </div>
      <div className="lg-camera-stage" style={{ aspectRatio }}>
        <Webcam
          id="webcam"
          ref={webcamRef}
          mirrored={false}
          className="lg-camera-video"
          onLoadedMetadata={() => {
            const video = webcamRef.current?.video
            if (video?.videoWidth && video?.videoHeight) {
              setAspectRatio(video.videoWidth / video.videoHeight)
            }
          }}
        />
        <canvas ref={canvasRef} className="lg-camera-canvas" />
      </div>
      <div className="lg-camera-foot lg-mono">
        <span>
          échantillons&nbsp;:{' '}
          <b>
            {sampleCount}/{sampleTarget}
          </b>
        </span>
      </div>
    </div>
  )
}
