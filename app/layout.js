import './globals.css';
import './sestia.css';
import Script from 'next/script';
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
        {/* crypto.randomUUID only exists on https/localhost; opening the dev
            server from a phone at http://192.168.x.x would otherwise break
            room creation, uploads, etc. getRandomValues works everywhere. */}
        <Script id="random-uuid-fallback" strategy="beforeInteractive">
          {"if(window.crypto&&!crypto.randomUUID){crypto.randomUUID=function(){return([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,function(c){return(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)})}}"}
        </Script>
      </head>
      <body>
        <GlobalErrorReporter />
        {children}
      </body>
    </html>
  );
}
