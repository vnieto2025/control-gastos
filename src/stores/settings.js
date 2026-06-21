import { defineStore } from 'pinia';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from './auth';

const DEFAULT_SALARY = 3850000;
const DEFAULT_PAY_DAY = 22;

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    salary: DEFAULT_SALARY,
    payDay: DEFAULT_PAY_DAY,
    loaded: false
  }),
  actions: {
    async load() {
      const auth = useAuthStore();
      const ref = doc(db, 'users', auth.user.uid, 'settings', 'budget');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        this.salary = data.salary ?? DEFAULT_SALARY;
        this.payDay = data.payDay ?? DEFAULT_PAY_DAY;
      }
      this.loaded = true;
    },
    async save(salary, payDay) {
      const auth = useAuthStore();
      const ref = doc(db, 'users', auth.user.uid, 'settings', 'budget');
      await setDoc(ref, { salary, payDay });
      this.salary = salary;
      this.payDay = payDay;
    }
  }
});
