import { Experience } from "../types";

const STRIPE_FUNCTION_URL =
  process.env.EXPO_PUBLIC_STRIPE_FUNCTION_URL ||
  "https://europe-west1-ernit-3fc0b.cloudfunctions.net/stripeCreatePaymentIntent";

export const stripeService = {
  /**
   * Create a PaymentIntent via Firebase HTTPS function
   * @param amount Price in euros
   * @param experienceId Experience ID
   * @param giverId Logged-in user ID
   * @returns clientSecret for Stripe confirmCardPayment
   */
  async createPaymentIntent(amount: number, experienceId: string, giverId: string) {
    try {
      const response = await fetch(STRIPE_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, experienceId, giverId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create PaymentIntent");
      if (!data.clientSecret) throw new Error("No clientSecret returned from Stripe");

      return data.clientSecret as string;
    } catch (err: any) {
      console.error("❌ stripeService.createPaymentIntent error:", err);
      throw new Error(err.message || "Stripe request failed");
    }
  },
};
