
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { User, ForensicHistoryItem } from '../types';

/**
 * ==========================================
 *  STEP 1: FIREBASE CONFIGURATION
 * ==========================================
 * Paste your Firebase Web App configuration below.
 * You can find this in Firebase Console > Project Settings > General.
 */
const firebaseConfig = {
  apiKey: "AIzaSyA0kA5Xji13UUM-LTDAsNFsBKeQXWrxLss",
  authDomain: "webreact-f970a.firebaseapp.com",
  projectId: "webreact-f970a",
  storageBucket: "webreact-f970a.firebasestorage.app",
  messagingSenderId: "417589616982",
  appId: "1:417589616982:web:1f857790697219511f36f7",
  measurementId: "G-TSW1767CG9"
};

/**
 * IMPORTANT: If you get 'auth/configuration-not-found', you MUST go to 
 * Firebase Console > Authentication > Sign-in Method and ENABLE 'Email/Password'.
 */

const mockDb = {
  users: JSON.parse(localStorage.getItem('veriscan_users_v7') || '{}'),
  sessions: JSON.parse(localStorage.getItem('veriscan_session_v7') || 'null'),
  history: JSON.parse(localStorage.getItem('veriscan_history_v7') || '{}'),

  save: () => {
    localStorage.setItem('veriscan_users_v7', JSON.stringify(mockDb.users));
    localStorage.setItem('veriscan_session_v7', JSON.stringify(mockDb.sessions));
    localStorage.setItem('veriscan_history_v7', JSON.stringify(mockDb.history));
  }
};

let useFirebase = false;
let auth: any = null;
let db: any = null;

try {
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("REPLACE")) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    useFirebase = true;
  }
} catch (e) {
  console.warn("⚠️ VeriScan: Firebase Initialization Blocked.", e);
  useFirebase = false;
}

export const storageService = {
  isLocalMode: () => !useFirebase,

  getProviderName: () => useFirebase ? "Cloud Infrastructure" : "Local Forensic Core",

  switchToLocal: () => {
    console.log("🛠️ Forensic Core: Force Diverting to Local Engine");
    useFirebase = false;
    auth = null;
    db = null;
  },

  subscribeToAuth: (callback: (user: User | null) => void) => {
    if (useFirebase && auth) {
      return onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            const userDoc = await getDoc(doc(db, "users", fbUser.uid));
            if (userDoc.exists()) {
              callback(userDoc.data() as User);
            } else {
              const defaultUser: User = {
                id: fbUser.uid,
                email: fbUser.email || '',
                name: fbUser.displayName || 'Forensic Operative',
                tier: 'free',
                createdAt: new Date().toISOString()
              };
              callback(defaultUser);
            }
          } catch (err) {
            callback(null);
          }
        } else {
          callback(mockDb.sessions);
        }
      });
    } else {
      setTimeout(() => callback(mockDb.sessions), 50);
      return () => { };
    }
  },

  signup: async (name: string, email: string, pass: string): Promise<User> => {
    const userId = `local_${Math.random().toString(36).substr(2, 9)}`;
    const localUser: User = { id: userId, name, email, tier: 'free', createdAt: new Date().toISOString() };

    if (useFirebase && auth) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const newUser: User = {
          id: cred.user.uid,
          name,
          email,
          tier: 'free',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", cred.user.uid), newUser);
        mockDb.users[email] = { ...newUser, password: pass };
        mockDb.save();
        return newUser;
      } catch (err: any) {
        if (err.code === 'auth/configuration-not-found') {
          storageService.switchToLocal();
          return storageService.signup(name, email, pass);
        }
        throw err;
      }
    } else {
      if (mockDb.users[email]) throw { code: 'auth/email-already-in-use' };
      mockDb.users[email] = { ...localUser, password: pass };
      mockDb.sessions = localUser;
      mockDb.save();
      return localUser;
    }
  },

  login: async (email: string, pass: string): Promise<User> => {
    if (useFirebase && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const userDoc = await getDoc(doc(db, "users", cred.user.uid));
        if (userDoc.exists()) return userDoc.data() as User;

        return {
          id: cred.user.uid,
          email: cred.user.email || '',
          name: 'Operative',
          tier: 'free',
          createdAt: new Date().toISOString()
        };
      } catch (err: any) {
        const localUser = mockDb.users[email];
        if (localUser && localUser.password === pass) {
          const { password, ...safeUser } = localUser;
          mockDb.sessions = safeUser;
          mockDb.save();
          return safeUser as User;
        }

        if (err.code === 'auth/configuration-not-found') {
          storageService.switchToLocal();
          return storageService.login(email, pass);
        }
        throw err; // RE-THROW ACTUAL ERROR
      }
    } else {
      const user = mockDb.users[email];
      if (!user || user.password !== pass) throw { code: 'auth/invalid-credential' };
      const { password, ...safeUser } = user;
      mockDb.sessions = safeUser;
      mockDb.save();
      return safeUser as User;
    }
  },

  logout: async () => {
    if (useFirebase && auth) {
      await signOut(auth).catch(() => { });
    }
    mockDb.sessions = null;
    mockDb.save();
  },

  getHistory: async (userId: string): Promise<ForensicHistoryItem[]> => {
    if (useFirebase && db) {
      try {
        const historyRef = collection(db, "users", userId, "history");
        const q = query(historyRef, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ForensicHistoryItem[];
      } catch (err) {
        return [];
      }
    } else {
      const userHistory = mockDb.history[userId] || [];
      return [...userHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  },

  saveHistoryItem: async (userId: string, item: Omit<ForensicHistoryItem, 'id'>): Promise<string> => {
    if (useFirebase && db) {
      try {
        const historyRef = collection(db, "users", userId, "history");
        const docRef = await addDoc(historyRef, { ...item, serverTime: serverTimestamp() });
        return docRef.id;
      } catch (err) {
        console.warn("Cloud save failed.");
      }
    }

    const newItem = { ...item, id: `hist_${Math.random().toString(36).substr(2, 9)}` };
    if (!mockDb.history[userId]) mockDb.history[userId] = [];
    mockDb.history[userId].push(newItem);
    mockDb.save();
    return newItem.id;
  },

  deleteHistoryItem: async (userId: string, itemId: string): Promise<void> => {
    if (useFirebase && db) {
      try {
        await deleteDoc(doc(db, "users", userId, "history", itemId));
      } catch (err) { }
    }

    if (mockDb.history[userId]) {
      mockDb.history[userId] = mockDb.history[userId].filter((i: any) => i.id !== itemId);
      mockDb.save();
    }
  }
};
