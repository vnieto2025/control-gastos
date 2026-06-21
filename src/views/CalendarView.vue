<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useExpensesStore } from '../stores/expenses';
import { currencyFmt, monthFmt, dateKey, sameDay } from '../utils/format';
import DayModal from '../components/DayModal.vue';

const auth = useAuthStore();
const expensesStore = useExpensesStore();

const currentDate = ref(startOfMonth(new Date()));
const selectedDateKey = ref(null);
const selectedDateObj = ref(null);
const menuOpen = ref(false);
const importInput = ref(null);

function startOfMonth(d) {
  const copy = new Date(d);
  copy.setDate(1);
  return copy;
}

const monthLabel = computed(() => monthFmt.format(currentDate.value));

const weeks = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = startOffset + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  const today = new Date();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push({ outside: true, key: `lead-${i}` });

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    const key = dateKey(cellDate);
    cells.push({
      outside: false,
      key,
      day: d,
      dateObj: cellDate,
      isToday: sameDay(cellDate, today),
      amount: expensesStore.totalsByDate[key] || 0
    });
  }

  for (let i = 0; i < trailing; i++) cells.push({ outside: true, key: `trail-${i}` });
  return cells;
});

const monthTotal = computed(() => {
  return weeks.value.reduce((sum, c) => sum + (c.outside ? 0 : c.amount), 0);
});

function fmt(n) {
  return currencyFmt.format(n);
}

function changeMonth(delta) {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() + delta);
  currentDate.value = startOfMonth(d);
}

function goToday() {
  currentDate.value = startOfMonth(new Date());
  menuOpen.value = false;
}

function openDay(cell) {
  if (cell.outside) return;
  selectedDateKey.value = cell.key;
  selectedDateObj.value = cell.dateObj;
}

function closeDay() {
  selectedDateKey.value = null;
  selectedDateObj.value = null;
}

async function onExport() {
  const all = await expensesStore.exportAll();
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respaldo-gastos-${dateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  menuOpen.value = false;
}

async function onImportChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const records = JSON.parse(text);
    await expensesStore.importAll(records);
    alert(`Importados ${records.length} registros.`);
  } catch (err) {
    alert('Archivo inválido.');
  }
  e.target.value = '';
  menuOpen.value = false;
}

watch(currentDate, (d) => expensesStore.watchMonth(d), { immediate: true });
onMounted(() => expensesStore.watchMonth(currentDate.value));
</script>

<template>
  <header class="topbar">
    <button class="navBtn" @click="changeMonth(-1)">‹</button>
    <div class="monthTitle">
      <h1>{{ monthLabel }}</h1>
      <span class="monthTotal">{{ fmt(monthTotal) }}</span>
    </div>
    <button class="navBtn" @click="changeMonth(1)">›</button>
    <button class="menuBtn" @click="menuOpen = !menuOpen">⋮</button>
  </header>

  <div v-if="menuOpen" class="menuPanel">
    <button @click="onExport">Exportar respaldo (JSON)</button>
    <label class="importLabel">
      Importar respaldo
      <input ref="importInput" type="file" accept="application/json" hidden @change="onImportChange">
    </label>
    <button @click="goToday">Ir a hoy</button>
    <button class="logoutBtn" @click="auth.logout()">Cerrar sesión</button>
  </div>

  <main>
    <div class="weekHeader">
      <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>
    </div>
    <div class="calendarGrid">
      <div
        v-for="cell in weeks"
        :key="cell.key"
        class="dayCell"
        :class="{ outside: cell.outside, today: cell.isToday }"
        @click="openDay(cell)"
      >
        <template v-if="!cell.outside">
          <span class="dayNum">{{ cell.day }}</span>
          <span v-if="cell.amount > 0" class="dayAmount">{{ fmt(cell.amount) }}</span>
        </template>
      </div>
    </div>
  </main>

  <DayModal
    v-if="selectedDateKey"
    :date-key="selectedDateKey"
    :date-obj="selectedDateObj"
    @close="closeDay"
  />
</template>
