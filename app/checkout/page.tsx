import OrderInfoInitializer from "../components/checkout/OrderInfoInitializer";
import BillingForm from "../components/checkout/BillingForm";
import OrderSummary from "../components/checkout/OrderSummary";
import { CheckoutProvider } from "../context/CheckoutContext";
import { ReduxProvider } from "../providers";

export default function CheckoutPage() {
  return (
    <ReduxProvider>
      <CheckoutProvider>
        <section className="section-wrap min-h-[calc(100vh-var(--header-height))]">
          <div className="app-shell grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column - Main Forms */}
            <div className="lg:col-span-2 space-y-8">
              <OrderInfoInitializer />
              <BillingForm />
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummary />
            </div>
          </div>
        </section>
      </CheckoutProvider>
    </ReduxProvider>
  );
}
