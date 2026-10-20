import { Geist, Geist_Mono, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/Components/Footer";
import PageViewTracker from "@/Components/PageViewTracker";
import GlobalContactWidget from "@/Components/GlobalContactWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata = {
  metadataBase: new URL("https://peervia.org"),
  title: "PeerVia | Honest advice from university students",
  description:
    "PeerVia connects high school students with real university students for free, honest guidance on courses, universities and student life.",
  applicationName: "PeerVia",
  openGraph: {
    siteName: "PeerVia",
    type: "website",
    url: "https://peervia.org",
    title: "PeerVia | Honest advice from university students",
    description:
      "Free, honest guidance from real university students on courses, universities and student life.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "PeerVia | Honest advice from university students",
    description:
      "Free, honest guidance from real university students on courses, universities and student life.",
    images: ["/logo.png"],
  },
};

// Tells Google that "PeerVia" is the name of this site and organisation.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "PeerVia",
      alternateName: ["Peervia", "PeerVia.org"],
      url: "https://peervia.org",
    },
    {
      "@type": "Organization",
      name: "PeerVia",
      url: "https://peervia.org",
      logo: "https://peervia.org/logo.png",
      sameAs: [
        "https://www.linkedin.com/company/peervia/",
        "https://www.instagram.com/peervia/",
      ],
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <PageViewTracker />
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
        <GlobalContactWidget />
      </body>
    </html>
  );
}