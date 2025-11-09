import {setGlobalOptions} from "firebase-functions";
import {aiGenerateHint} from "./aiGenerateHint";
import {stripeCreatePaymentIntent} from "./stripeCreatePaymentIntent";

setGlobalOptions({maxInstances: 10});

export {aiGenerateHint, stripeCreatePaymentIntent};