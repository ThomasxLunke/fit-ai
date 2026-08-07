import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// The exact amber "lg-dot" diamond used right in front of the "Fit-AI"
// wordmark in the header (see .lg-logo .lg-dot in app/landing.css) — same
// mark, just blown up onto the dark navy background used everywhere else.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0e14',
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 15,
            height: 15,
            background: '#e8963b',
            borderRadius: 2,
            transform: 'rotate(45deg)',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
