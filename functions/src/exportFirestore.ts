import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as fs from "fs";

const SERVICE_ACCOUNT_KEY = defineSecret("SERVICE_ACCOUNT_KEY");

export const exportFirestore = onRequest(
  {
    region: "europe-west1",
    secrets: [SERVICE_ACCOUNT_KEY],
  },
  async (req, res) => {
    try {
      // Parse secret and init app
      const key = JSON.parse(SERVICE_ACCOUNT_KEY.value());
      admin.initializeApp({ credential: admin.credential.cert(key) });
      const db = admin.firestore();

      const COLLECTIONS = [
        "users",
        "experiences",
        "goals",
        "experienceGifts",
      ];

      const exportDir = "/tmp/exports"; // safe temp folder in Firebase Functions
      fs.mkdirSync(exportDir, { recursive: true });

      for (const col of COLLECTIONS) {
        const snapshot = await db.collection(col).get();
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const filePath = `${exportDir}/${col}.json`;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ Exported ${data.length} docs from ${col}`);
      }

      res.status(200).send("🎉 Export completed successfully!");
    } catch (err: any) {
      console.error("❌ Export failed:", err);
      res.status(500).send(err.message || "Export failed");
    }
  }
);
