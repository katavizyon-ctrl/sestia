import './globals.css';
import './sestia.css';
import GlobalErrorReporter from '@/components/GlobalErrorReporter';
import { ASSISTANT_NAME } from '@/lib/constants';

export const metadata = {
  title: ASSISTANT_NAME,
  description: 'SESTIA — Yaşam alanında, hep yanında. Düzenlemeden yerleşime, elindekilerle yeni olasılıklar keşfet.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: ASSISTANT_NAME,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F4EFE7',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        />
        <link rel="icon" href="/sestia/logo.webp" type="image/webp" />
        <link rel="apple-touch-icon" href="/sestia/logo.webp" />
      </head>
      <body>
        <GlobalErrorReporter />
        {children}
      </body>
    </html>
  );
}
