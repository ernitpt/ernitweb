import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

const STRIPE_SECRET = defineSecret("STRIPE_SECRET_KEY");

export const stripeCreatePaymentIntent = onRequest(
  {
    region: "europe-west1",
    secrets: [STRIPE_SECRET],
  },
  async (req, res) => {
    const origin = req.headers.origin || "";
    console.log("stripeCreatePaymentIntent origin:", origin);

    const allowedOrigins: (string | RegExp)[] = [
      "http://localhost:8081",
      "http://localhost:3000",
      /^https:\/\/.*\.vercel\.app$/,
      "https://ernit-nine.vercel.app",
      "https://ernit.app",
    ];

    const allowOrigin = allowedOrigins.some((entry) =>
      entry instanceof RegExp ? entry.test(origin) : entry === origin
    );
    if (allowOrigin) res.set("Access-Control-Allow-Origin", origin);

    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "Content-Type, Authorization"
    );
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Vary", "Origin");

    if (req.method === "OPTIONS") {
      res.status(204).send();
      return;
    }

    try {
      const { amount, experienceId, giverId } = req.body || {};
      if (!amount || !experienceId || !giverId) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }

      const stripe = new Stripe(STRIPE_SECRET.value(), {
        apiVersion: "2024-06-20" as any,
      });

      console.log("💳 Creating PaymentIntent:", { amount, experienceId, giverId });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "eur",
        automatic_payment_methods: { enabled: true, allow_redirects: "always" },
        metadata: { experienceId, giverId },
      });

      // ✅ Just send, don't return
      res.status(200).json({ clientSecret: intent.client_secret });
    } catch (err: any) {
      console.error("❌ Stripe error:", err);
      res.status(500).json({ error: err.message || "Internal error" });
    }
  }
);
