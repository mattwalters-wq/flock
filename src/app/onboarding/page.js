import StartClient from './StartClient';

export const metadata = {
  title: 'flock · create your community',
  description: 'Launch your own fan community on flock. Free while we build.',
};

export default function OnboardingPage() {
  // Go straight to the wizard. The old dark marketing landing inside StartClient
  // is fully replaced by the new homepage at /start, so it's no longer shown.
  return <StartClient showForm />;
}
