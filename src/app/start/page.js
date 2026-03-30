import StartClient from './StartClient';

export const metadata = {
  title: 'flock · fan communities for independent artists',
  description: 'Your website. Your link in bio. Your fan community. All in one place. Free while we build.',
  openGraph: {
    type: 'website',
    url: 'https://fans-flock.com',
    title: 'flock · fan communities for independent artists',
    description: 'Your website. Your link in bio. Your fan community. All in one place.',
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
    description: 'Your website. Your link in bio. Your fan community. All in one place.',
    images: ['https://fans-flock.com/og.png'],
  },
};

export default function StartPage() {
  return <StartClient />;
}
