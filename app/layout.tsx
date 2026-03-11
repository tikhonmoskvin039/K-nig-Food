import type { Metadata, Viewport } from "next";
import { Roboto, Manrope } from "next/font/google";
import "./globals.css";
import "react-image-crop/dist/ReactCrop.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { LocalizationProvider } from "./context/LocalizationContext";
import { Toaster } from "sonner";
import AuthProvider from "./providers/SessionProvider";
import { Suspense } from "react";
import GlobalLoader from "./components/GlobalLoader";
import { ThemeProvider } from "./context/ThemeContext";
import HapticTapProvider from "./components/HapticTapProvider";
import PWASetup from "./components/PWASetup";

export const metadata: Metadata = {
  applicationName: "K-nig Food",
  title: {
    default: "K-nig Food",
    template: "%s | K-nig Food",
  },
  description: "K-nig Food storefront with resilient offline-first actions.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg" }],
  },
  appleWebApp: {
    capable: true,
    title: "K-nig Food",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00d7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#050712" },
  ],
};

// Load two fonts: one for headings, one for body
const roboto = Roboto({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-main",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`
          antialiased
          ${roboto.variable}
          ${manrope.variable}
        `}
      >
        <AuthProvider>
          <ThemeProvider>
            <LocalizationProvider>
              <HapticTapProvider />
              <PWASetup />
              <Header />
              <Suspense fallback={<GlobalLoader />}>
                <div className="pt-(--header-height)">{children}</div>
              </Suspense>
              <Footer />
              <Toaster position="top-right" richColors />
            </LocalizationProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
