import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import * as admin from "firebase-admin";

const STRIPE_SECRET = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

const db = admin.firestore();

// ========== STRIPE WEBHOOK HANDLER ==========
export const stripeWebhook = onRequest(
  {
    region: "europe-west1",
    secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET],
  },
  async (req, res) => {
    console.log("🔔 Webhook received");

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const stripe = new Stripe(STRIPE_SECRET.value(), {
      apiVersion: "2024-06-20" as any,
    });

    const sig = req.headers["stripe-signature"];
    if (!sig) {
      console.error("❌ No Stripe signature");
      res.status(400).send("No signature");
      return;
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    console.log("✅ Webhook verified:", event.type);

    // Handle payment_intent.succeeded event
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("💰 Payment succeeded:", paymentIntent.id);

      try {
        await handleSuccessfulPayment(paymentIntent);
        res.status(200).json({ received: true });
      } catch (err: any) {
        console.error("❌ Error handling payment:", err);
        // Still return 200 to acknowledge receipt, but log error
        res.status(200).json({ received: true, error: err.message });
      }
      return;
    }

    // Handle payment_intent.payment_failed event
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("❌ Payment failed:", paymentIntent.id);
      // You could add logic here to notify the user or clean up
    }

    res.status(200).json({ received: true });
  }
);

// ========== HELPER: HANDLE SUCCESSFUL PAYMENT ==========
async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata;
  const paymentIntentId = paymentIntent.id;

  console.log("📦 Processing payment with metadata:", metadata);

  // Validate required metadata
  if (!metadata.experienceId || !metadata.giverId) {
    console.error("❌ Missing required metadata");
    throw new Error("Missing required metadata in payment intent");
  }

  // Check if gift already exists for this payment intent
  const existingGifts = await db
    .collection("experienceGifts")
    .where("paymentIntentId", "==", paymentIntentId)
    .limit(1)
    .get();

  if (!existingGifts.empty) {
    console.log("⚠️ Gift already exists for this payment intent");
    return existingGifts.docs[0].data();
  }

  // Generate unique claim code
  const claimCode = generateClaimCode();

  // Create the experience gift
  const experienceGift = {
    id: db.collection("experienceGifts").doc().id,
    giverId: metadata.giverId,
    giverName: metadata.giverName || "",
    experienceId: metadata.experienceId,
    partnerId: metadata.partnerId || "",
    personalizedMessage: metadata.personalizedMessage || "",
    deliveryDate: admin.firestore.Timestamp.now(),
    status: "pending",
    payment: "paid",
    paymentIntentId: paymentIntentId,
    claimCode: claimCode,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  // Save to Firestore
  await db
    .collection("experienceGifts")
    .doc(experienceGift.id)
    .set(experienceGift);

  console.log("✅ Experience gift created:", experienceGift.id);

  // Optional: Send notification to giver
  // await sendGiftCreatedNotification(experienceGift);

  return experienceGift;
}

// ========== HELPER: GENERATE CLAIM CODE ==========
function generateClaimCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}