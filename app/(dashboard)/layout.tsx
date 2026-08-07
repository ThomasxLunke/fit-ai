import '../landing.css'
import { landingFontVariables } from '@/components/landing/fonts'
import { GridBackground } from '@/components/landing/grid-background'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`landing-scope relative ${landingFontVariables}`}>
      <GridBackground />
      <DashboardHeader />
      <main className="pb-10">{children}</main>
    </div>
  )
}
