import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="text-white flex flex-col items-center justify-center h-screen">
      <h2>Not Found</h2>
      <p>Could not find requested resource</p>
      <Link href="/dashboard ">Return to dashboard</Link>
    </div>
  )
}
