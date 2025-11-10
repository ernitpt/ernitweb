import {setGlobalOptions} from "firebase-functions";
import {aiGenerateHint} from "./aiGenerateHint";
import {stripeCreatePaymentIntent} from "./stripeCreatePaymentIntent";
import {getGiftByPaymentIntent} from "./getGiftByPaymentIntent";
import {stripeWebhook} from "./stripeWebhook";
import {updatePaymentIntentMetadata} from "./updatePaymentIntentMetadata";

setGlobalOptions({maxInstances: 10});

export {aiGenerateHint, stripeCreatePaymentIntent, getGiftByPaymentIntent, stripeWebhook, updatePaymentIntentMetadata};