import { setGlobalOptions } from "firebase-functions";
import { aiGenerateHint } from "./aiGenerateHint";
import { stripeCreatePaymentIntent } from "./stripeCreatePaymentIntent";
import { getGiftsByPaymentIntent } from "./getGiftsByPaymentIntent";
import { stripeWebhook } from "./stripeWebhook";
import { updatePaymentIntentMetadata } from "./updatePaymentIntentMetadata";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from 'firebase-admin';

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });
export const db = getFirestore();

export { aiGenerateHint, stripeCreatePaymentIntent, getGiftsByPaymentIntent, stripeWebhook, updatePaymentIntentMetadata };