import { Roboto, Manrope } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { LocalizationProvider } from "./context/LocalizationContext";
import { Toaster } from "sonner";

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
        <LocalizationProvider>
          <Header />
          <div className="pt-(--header-height)">{children}</div>
          <Footer />
          <Toaster position="top-right" richColors />
        </LocalizationProvider>
      </body>
    </html>
  );
}
