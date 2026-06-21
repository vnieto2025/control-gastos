import { defineStore } from 'pinia';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth } from '../firebase';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    ready: false,
    error: ''
  }),
  actions: {
    listen() {
      onAuthStateChanged(auth, (user) => {
        this.user = user;
        this.ready = true;
      });
    },
    async login(email, password) {
      this.error = '';
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (e) {
        this.error = mapAuthError(e.code);
        throw e;
      }
    },
    async register(email, password) {
      this.error = '';
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (e) {
        this.error = mapAuthError(e.code);
        throw e;
      }
    },
    async logout() {
      await signOut(auth);
    }
  }
});

function mapAuthError(code) {
  const map = {
    'auth/invalid-email': 'Correo inválido.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ese correo ya está registrado.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.'
  };
  return map[code] || 'Ocurrió un error, intenta de nuevo.';
}
