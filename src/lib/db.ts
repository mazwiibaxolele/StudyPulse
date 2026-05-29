import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import type { Module, StudySession, Mark, UserPreferences, ChatMessage } from '../types';

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  return user.uid;
}

// Helper to convert Firestore document to our type
function convertDoc<T>(doc: any): T {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
  } as T;
}

export const modulesDb = {
  async getAll(): Promise<Module[]> {
    const uid = requireUser();
    const q = query(
      collection(db, 'modules'), 
      where('user_id', '==', uid),
      where('isActive', '==', true),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertDoc<Module>(doc));
  },

  async create(data: Omit<Module, 'id' | 'createdAt' | 'isActive'>): Promise<Module> {
    const uid = requireUser();
    const docRef = await addDoc(collection(db, 'modules'), {
      ...data,
      user_id: uid,
      isActive: true,
      createdAt: serverTimestamp()
    });
    const newDoc = await getDoc(docRef);
    return convertDoc<Module>(newDoc);
  },

  async update(id: string, data: Partial<Module>): Promise<Module> {
    const docRef = doc(db, 'modules', id);
    await updateDoc(docRef, data);
    const updatedDoc = await getDoc(docRef);
    return convertDoc<Module>(updatedDoc);
  },

  async archive(id: string): Promise<void> {
    const docRef = doc(db, 'modules', id);
    await updateDoc(docRef, { isActive: false });
  }
};

export const sessionsDb = {
  async getAll(): Promise<StudySession[]> {
    const uid = requireUser();
    const q = query(
      collection(db, 'sessions'), 
      where('user_id', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertDoc<StudySession>(doc));
  },

  async create(data: Omit<StudySession, 'id' | 'createdAt'>): Promise<StudySession> {
    const uid = requireUser();
    const docRef = await addDoc(collection(db, 'sessions'), {
      ...data,
      user_id: uid,
      createdAt: serverTimestamp()
    });
    const newDoc = await getDoc(docRef);
    return convertDoc<StudySession>(newDoc);
  }
};

export const marksDb = {
  async getAll(): Promise<Mark[]> {
    const uid = requireUser();
    const q = query(
      collection(db, 'marks'), 
      where('user_id', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertDoc<Mark>(doc));
  },

  async create(data: Omit<Mark, 'id' | 'createdAt'>): Promise<Mark> {
    const uid = requireUser();
    const docRef = await addDoc(collection(db, 'marks'), {
      ...data,
      user_id: uid,
      createdAt: serverTimestamp()
    });
    const newDoc = await getDoc(docRef);
    return convertDoc<Mark>(newDoc);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'marks', id));
  }
};

export const preferencesDb = {
  async get(): Promise<UserPreferences | null> {
    const uid = requireUser();
    const docRef = doc(db, 'preferences', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as UserPreferences;
  },

  async update(data: Partial<UserPreferences>): Promise<UserPreferences> {
    const uid = requireUser();
    const docRef = doc(db, 'preferences', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await updateDoc(docRef, data); // Wait, if it doesn't exist, we must use setDoc
      // Let's use setDoc with merge instead
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, data, { merge: true });
    } else {
      await updateDoc(docRef, data);
    }
    const updated = await getDoc(docRef);
    return updated.data() as UserPreferences;
  }
};

export const chatDb = {
  async getAll(): Promise<ChatMessage[]> {
    try {
      const uid = requireUser();
      const q = query(
        collection(db, 'chat_messages'), 
        where('user_id', '==', uid),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => convertDoc<ChatMessage>(doc));
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async add(role: 'user' | 'assistant', content: string): Promise<ChatMessage> {
    const uid = requireUser();
    const docRef = await addDoc(collection(db, 'chat_messages'), {
      user_id: uid,
      role,
      content,
      createdAt: serverTimestamp()
    });
    const newDoc = await getDoc(docRef);
    return convertDoc<ChatMessage>(newDoc);
  },

  async clear(): Promise<void> {
    const uid = requireUser();
    const q = query(
      collection(db, 'chat_messages'), 
      where('user_id', '==', uid)
    );
    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(promises);
  }
};
