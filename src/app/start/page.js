import StartClient from './StartClient';

export const metadata = {
  title: 'flock · fan communities for independent artists',
  description: 'Social media broke the artist-fan relationship. Flock gives it back. Your community, your currency, your rules.',
  openGraph: {
    type: 'website',
    url: 'https://fans-flock.com/start',
    title: 'flock · fan communities for independent artists',
    description: 'Social media broke the artist-fan relationship. Flock gives it back. Your community, your currency, your rules.',
    images: [
      {
        url: 'https://fans-flock.com/og.png',
        width: 1200,
        height: 630,
        alt: 'flock · fan communities for independent artists',
      },
    ],
    siteName: 'flock',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'flock · fan communities for independent artists',
    description: 'Social media broke the artist-fan relationship. Flock gives it back.',
    images: ['https://fans-flock.com/og.png'],
  },
};

export default function StartPage() {
  return <StartClient />;
}
