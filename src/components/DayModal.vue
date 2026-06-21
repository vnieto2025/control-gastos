<script setup>
import { ref, computed } from 'vue';
import { useExpensesStore } from '../stores/expenses';
import { currencyFmt, dayTitleFmt } from '../utils/format';

const props = defineProps({
  dateKey: { type: String, required: true },
  dateObj: { type: Date, required: true }
});
defineEmits(['close']);

const expensesStore = useExpensesStore();
const amount = ref('');
const description = ref('');

const dayExpenses = computed(() => expensesStore.expensesForDate(props.dateKey));
const dayTotal = computed(() => dayExpenses.value.reduce((sum, e) => sum + e.amount, 0));
const title = computed(() => dayTitleFmt.format(props.dateObj));

async function onSubmit() {
  const value = parseFloat(amount.value);
  if (!value || value <= 0 || !description.value.trim()) return;
  await expensesStore.addExpense(props.dateKey, value, description.value.trim());
  amount.value = '';
  description.value = '';
}

async function onDelete(id) {
  await expensesStore.deleteExpense(id);
}

function fmt(n) {
  return currencyFmt.format(n);
}
</script>

<template>
  <div class="modalOverlay" @click.self="$emit('close')">
    <div class="modalSheet">
      <div class="modalHeader">
        <h2>{{ title }}</h2>
        <button class="closeBtn" @click="$emit('close')">✕</button>
      </div>

      <form class="expenseForm" @submit.prevent="onSubmit">
        <input v-model="amount" type="number" placeholder="Monto" inputmode="decimal" min="0" step="any" required>
        <input v-model="description" type="text" placeholder="Descripción" required maxlength="120">
        <button type="submit">Agregar</button>
      </form>

      <div class="dayTotal">Total del día: <strong>{{ fmt(dayTotal) }}</strong></div>

      <ul class="expenseList">
        <li v-for="exp in dayExpenses" :key="exp.id">
          <div class="itemInfo">
            <span class="itemDesc">{{ exp.description }}</span>
            <span class="itemAmount">{{ fmt(exp.amount) }}</span>
          </div>
          <button class="deleteBtn" @click="onDelete(exp.id)">Eliminar</button>
        </li>
      </ul>
    </div>
  </div>
</template>
