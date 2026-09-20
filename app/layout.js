import './globals.css';
import GlobalErrorReporter from '@/components/GlobalErrorReporter';

export const metadata = {
  title: 'Bir Oda, Bir Karar',
  description: 'Bir eşyaya karar ver: tut, sat, bağışla, at ya da geri dönüştür — AI önerisiyle.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bir Oda, Bir Karar',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3ECE2' },
    { media: '(prefers-color-scheme: dark)', color: '#211D18' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <GlobalErrorReporter />
        {children}
      </body>
    </html>
  );
}
