import {setGlobalOptions} from "firebase-functions";
import {aiGenerateHint} from "./aiGenerateHint";

setGlobalOptions({maxInstances: 10});

export {aiGenerateHint};
