import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Substitua com suas credenciais do Firebase
// Você pode obter essas credenciais em: https://console.firebase.google.com/
const firebaseConfig = {
    apiKey: "AIzaSyCJbUchf3RgsIr8zy0eiB-KZxWThVcTqVo",
    authDomain: "futebol-universe.firebaseapp.com",
    projectId: "futebol-universe",
    storageBucket: "futebol-universe.firebasestorage.app",
    messagingSenderId: "959271984532",
    appId: "1:959271984532:web:1992123e37bb551f264381"
};

// Inicializa o Firebase
export const app = initializeApp(firebaseConfig);

// Inicializa o Firestore
export const db = getFirestore(app);

// Inicializa o Auth (caso queira adicionar autenticação no futuro)
export const auth = getAuth(app);
