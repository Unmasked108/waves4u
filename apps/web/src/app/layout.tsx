import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { SITE } from '@/lib/site';
import Consent from '@/components/Consent';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import JsonLd from '@/components/JsonLd';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap', variable: '--font-playfair', weight: ['600', '700'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `waves4u · ${SITE.tagline} · ${SITE.subTagline}`, template: '%s | waves4u' },
  description: SITE.description,
  applicationName: 'waves4u',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'waves4u',
    locale: 'en_IN',
    url: '/',
    title: `waves4u · ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: '/logo.png', width: 249, height: 278, alt: 'waves4u: Turning waves into wins' }],
  },
  twitter: { card: 'summary', title: `waves4u · ${SITE.tagline}`, description: SITE.description, images: ['/logo.png'] },
  robots: { index: true, follow: true },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
};

export const viewport: Viewport = { themeColor: '#0F2A4A', width: 'device-width', initialScale: 1 };

const orgLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE.url}/#org`,
      name: 'waves4u',
      url: SITE.url,
      logo: `${SITE.url}/logo.png`,
      slogan: `${SITE.tagline} · ${SITE.subTagline}`,
      sameAs: Object.values(SITE.social).filter(Boolean),
      contactPoint: [{ '@type': 'ContactPoint', telephone: SITE.phone, contactType: 'customer service', areaServed: 'IN', availableLanguage: ['English', 'Hindi', 'Gujarati'] }],
    },
    {
      '@type': 'FinancialService',
      '@id': `${SITE.url}/#business`,
      name: 'waves4u',
      url: SITE.url,
      image: `${SITE.url}/logo.png`,
      telephone: SITE.phone,
      email: SITE.email,
      address: { '@type': 'PostalAddress', streetAddress: SITE.address, addressCountry: 'IN' },
      areaServed: 'IN',
      parentOrganization: { '@id': `${SITE.url}/#org` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <noscript><style>{`.reveal{opacity:1!important;transform:none!important}`}</style></noscript>
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <JsonLd data={orgLd} />
        <AuthProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <Consent />
        </AuthProvider>
      </body>
    </html>
  );
}
