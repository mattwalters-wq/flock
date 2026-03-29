import type { Metadata } from 'next'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'

export const metadata: Metadata = {
  title: 'Start your community — Flock',
    description:
        'Create your own fan community on Flock. Set up your artist page and invite your fans in minutes.',
        }

        export default function StartPage() {
          return (
              <main className="start-shell">
                    <OnboardingFlow />
                        </main>
                          )
                          }
                          