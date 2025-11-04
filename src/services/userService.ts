import { doc, setDoc, getDoc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { User, Goal, Experience, UserProfile } from '../types';
import { experienceService } from './ExperienceService';

export class UserService {
  private static instance: UserService;

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /** Create a user document after sign-up */
  async createUserProfile(user: User): Promise<void> {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /** Get user profile */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? (snapshot.data().profile as UserProfile) : null;
  }

  async getUserById(userId: string): Promise<User | null> {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();

    const parseDate = (value: any): Date => {
      if (value instanceof Timestamp) {
        return value.toDate();
      }

      if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }

      return new Date();
    };

    return {
      id: userId,
      email: data.email || '',
      displayName: data.displayName || undefined,
      userType: data.userType || 'giver',
      createdAt: parseDate(data.createdAt),
      wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
      profile: data.profile
        ? {
            ...data.profile,
            createdAt: parseDate(data.profile.createdAt),
            updatedAt: parseDate(data.profile.updatedAt),
          }
        : undefined,
    };
  }

    /** Get wishlist */
  // async getWishlist(userId: string): Promise<Experience[] | null> {
  //   const userRef = doc(db, 'users', userId);
  //   const snapshot = await getDoc(userRef);
  //   return snapshot.exists() ? (snapshot.data().wishlist as Experience[]) : null;
  // }
  async getUserName(userId: string): Promise<string> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.displayName || 'Unknown';
    }
    return 'Unknown';
  } catch (error) {
    console.error('Error fetching user name:', error);
    return 'Unknown';
  }
}

  async getWishlist(userId: string): Promise<Experience[]> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const wishlistIds = userDoc.data()?.wishlist || [];
  const experiences = await Promise.all(
    wishlistIds.map((id: string) => experienceService.getExperienceById(id))
  );
  return experiences.filter(Boolean);
}

  /** Update user profile */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
  const userRef = doc(db, 'users', userId);

  // If updating profile subdocument
  if (updates.profile) {
    const profileUpdates = {
      ...updates.profile,
      updatedAt: new Date().toISOString(),
    };

    const userUpdates: any = {
      profile: profileUpdates,
      updatedAt: new Date().toISOString(),
    };

    // If profile.name exists, also update displayName
    if (updates.profile.name) {
      userUpdates.displayName = updates.profile.name;
    }

    await updateDoc(userRef, userUpdates);
  } else {
    // Regular updates
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }
}


  /** Add a goal to user’s subcollection */
  async addUserGoal(userId: string, goal: Goal): Promise<void> {
    const goalsRef = collection(db, 'users', userId, 'goals');
    await addDoc(goalsRef, {
      ...goal,
      createdAt: goal.createdAt.toISOString(),
    });
  }
}

export const userService = UserService.getInstance();
