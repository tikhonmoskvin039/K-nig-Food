'use client';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import ContactUsForm from "../components/ContactUsForm";

// Get reCAPTCHA site key at module level (replaced at build time by Next.js)
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function ContactPage() {
    // Show error if reCAPTCHA key is not configured
    if (!RECAPTCHA_SITE_KEY) {
      return (
        <main className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
            <p className="text-gray-700">
              reCAPTCHA site key is not configured. Please set NEXT_PUBLIC_RECAPTCHA_SITE_KEY environment variable.
            </p>
          </div>
        </main>
      );
    }

    return (
      <main>
        <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
            <ContactUsForm />
        </GoogleReCaptchaProvider>
      </main>
    );
  }