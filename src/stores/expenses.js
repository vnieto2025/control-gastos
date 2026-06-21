import { defineStore } from 'pinia';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from './auth';
import { dateKey } from '../utils/format';

export const useExpensesStore = defineStore('expenses', {
  state: () => ({
    expenses: [],
    unsubscribe: null
  }),
  getters: {
    totalsByDate(state) {
      const totals = {};
      for (const exp of state.expenses) {
        totals[exp.date] = (totals[exp.date] || 0) + exp.amount;
      }
      return totals;
    }
  },
  actions: {
    expensesForDate(key) {
      return this.expenses
        .filter((e) => e.date === key)
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    },
    watchMonth(monthDate) {
      const auth = useAuthStore();
      if (!auth.user) return;
      if (this.unsubscribe) this.unsubscribe();

      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const start = dateKey(new Date(year, month, 1));
      const end = dateKey(new Date(year, month + 1, 0));

      const expensesRef = collection(db, 'users', auth.user.uid, 'expenses');
      const q = query(expensesRef, where('date', '>=', start), where('date', '<=', end), orderBy('date'));

      this.unsubscribe = onSnapshot(q, (snapshot) => {
        this.expenses = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            date: data.date,
            amount: data.amount,
            description: data.description,
            createdAtMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0
          };
        });
      });
    },
    stopWatching() {
      if (this.unsubscribe) this.unsubscribe();
      this.unsubscribe = null;
      this.expenses = [];
    },
    async addExpense(date, amount, description) {
      const auth = useAuthStore();
      const expensesRef = collection(db, 'users', auth.user.uid, 'expenses');
      await addDoc(expensesRef, { date, amount, description, createdAt: serverTimestamp() });
    },
    async deleteExpense(id) {
      const auth = useAuthStore();
      await deleteDoc(doc(db, 'users', auth.user.uid, 'expenses', id));
    },
    async exportAll() {
      const auth = useAuthStore();
      const expensesRef = collection(db, 'users', auth.user.uid, 'expenses');
      const snapshot = await getDocs(expensesRef);
      return snapshot.docs.map((d) => {
        const data = d.data();
        return { date: data.date, amount: data.amount, description: data.description };
      });
    },
    async importAll(records) {
      const auth = useAuthStore();
      const expensesRef = collection(db, 'users', auth.user.uid, 'expenses');
      for (const r of records) {
        await addDoc(expensesRef, {
          date: r.date,
          amount: r.amount,
          description: r.description,
          createdAt: serverTimestamp()
        });
      }
    }
  }
});
