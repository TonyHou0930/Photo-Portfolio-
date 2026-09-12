import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TonyHOU — Portfolio',
  description: 'Photography portfolio with knowledge graph',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('portfolio-theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}` }} />
        {children}
      </body>
    </html>
  );
}
