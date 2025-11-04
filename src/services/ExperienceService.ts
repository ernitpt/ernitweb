import { doc, getDoc } from "firebase/firestore";
import { db } from './firebase';
import { Experience } from "../types";

/**
 * Service for interacting with the 'experiences' collection in Firestore.
 */
export const experienceService = {
  /**
   * Get a single experience by its document ID.
   */
  async getExperienceById(id: string): Promise<Experience | null> {
    try {
      const docRef = doc(db, "experiences", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Experience;
      } else {
        console.warn(`Experience not found: ${id}`);
        return null;
      }
    } catch (error) {
      console.error("Error fetching experience:", error);
      return null;
    }
  },
};
