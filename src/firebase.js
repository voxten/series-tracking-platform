import { initializeApp } from "firebase/app";
import { getFirestore } from '@firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA8r6x1n156WyZTmh4sfLJ_hpkPxoRMKxI",
  authDomain: "tracking-site-platform.firebaseapp.com",
  projectId: "tracking-site-platform",
  storageBucket: "tracking-site-platform.appspot.com",
  messagingSenderId: "476683781382",
  appId: "1:476683781382:web:08a195a36cf68f65a48a87"
};

const app = initializeApp(firebaseConfig);

export const firestore = getFirestore(app);
