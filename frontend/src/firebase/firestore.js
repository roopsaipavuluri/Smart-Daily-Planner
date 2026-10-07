import { getFirestore } from 'firebase/firestore';
import { firebaseApp } from './config';

export const db = firebaseApp ? getFirestore(firebaseApp) : null;
