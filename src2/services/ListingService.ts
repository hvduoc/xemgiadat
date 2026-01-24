import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import type { ListingRecord } from '../types';

type ListingCreatePayload = {
  parcel_objectid: number;
  maxa: string;
  title: string;
  description: string;
  price: number;
  currency: 'VND';
  images: string[];
  area: number;
  address: string;
  lat: number;
  lng: number;
};

const firebaseConfig = {
  apiKey: 'AIzaSyDu9tYpJdMPT7Hvk2_Ug8XHwxRQXoakRfs',
  authDomain: 'xemgiadat-dfe15.firebaseapp.com',
  projectId: 'xemgiadat-dfe15',
  storageBucket: 'xemgiadat-dfe15.appspot.com',
  messagingSenderId: '361952598367',
  appId: '1:361952598367:web:c1e2e3b1a6d5d8c797beea',
  measurementId: 'G-XT932D9N1N'
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export class ListingService {
  /** Upload images to Storage and return public URLs */
  public async uploadImages(files: File[]): Promise<string[]> {
    if (!files.length) return [];
    const uploads = files.map(async (file) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const objectPath = `listings/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, objectPath);
      const snapshot = await uploadBytes(storageRef, file);
      return getDownloadURL(snapshot.ref);
    });
    return Promise.all(uploads);
  }

  /** Create listing document */
  public async createListing(payload: ListingCreatePayload): Promise<string> {
    const user = auth.currentUser;
    const docRef = await addDoc(collection(db, 'listings'), {
      ...payload,
      status: 'ACTIVE',
      currency: 'VND',
      user_uid: user ? user.uid : null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return docRef.id;
  }

  /** Fetch single listing */
  public async getListing(id: string): Promise<ListingRecord | null> {
    const snap = await getDoc(doc(db, 'listings', id));
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return {
      id: snap.id,
      ...data,
    } as ListingRecord;
  }
}
