<script setup>
import { ref, computed, onMounted } from 'vue';
import { Pie, Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { useExpensesStore } from '../stores/expenses';
import { useSettingsStore } from '../stores/settings';
import { currencyFmt, dateKey } from '../utils/format';
import { getCycleRange, getPreviousCycleRange } from '../utils/payCycle';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CHART_TEXT_COLOR = '#8a9aa5';
const CHART_GRID_COLOR = '#2c3640';
const CATEGORY_COLORS = ['#2fb88a', '#3a8fe0', '#e0a23a', '#e0584f', '#9b6fe0', '#4fc3c7', '#8a9aa5'];

const expensesStore = useExpensesStore();
const settingsStore = useSettingsStore();

const currentCycleExpenses = ref([]);
const previousCycleTotal = ref(0);
const loadingCycle = ref(true);

const salaryInput = ref(settingsStore.salary);
const payDayInput = ref(settingsStore.payDay);
const savingSettings = ref(false);

const rangeFrom = ref('');
const rangeTo = ref('');
const rangeResult = ref(null);
const rangeLoading = ref(false);

function fmt(n) {
  return currencyFmt.format(n);
}

async function loadCycleData() {
  loadingCycle.value = true;
  const current = getCycleRange(settingsStore.payDay, new Date());
  const previous = getPreviousCycleRange(settingsStore.payDay, new Date());

  currentCycleExpenses.value = await expensesStore.queryRange(dateKey(current.start), dateKey(current.end));
  const prevExpenses = await expensesStore.queryRange(dateKey(previous.start), dateKey(previous.end));
  previousCycleTotal.value = prevExpenses.reduce((sum, e) => sum + e.amount, 0);
  loadingCycle.value = false;
}

onMounted(async () => {
  if (!settingsStore.loaded) await settingsStore.load();
  salaryInput.value = settingsStore.salary;
  payDayInput.value = settingsStore.payDay;
  await loadCycleData();
});

const currentTotal = computed(() => currentCycleExpenses.value.reduce((sum, e) => sum + e.amount, 0));
const budgetPercent = computed(() => {
  if (!settingsStore.salary) return 0;
  return Math.round((currentTotal.value / settingsStore.salary) * 100);
});
const remaining = computed(() => settingsStore.salary - currentTotal.value);

const alertLevel = computed(() => {
  if (budgetPercent.value >= 100) return 'danger';
  if (budgetPercent.value >= 80) return 'warning';
  if (budgetPercent.value >= 50) return 'notice';
  return null;
});

const cycleRange = computed(() => getCycleRange(settingsStore.payDay, new Date()));

const dailyAverage = computed(() => {
  const today = new Date();
  const start = cycleRange.value.start;
  const end = today < cycleRange.value.end ? today : cycleRange.value.end;
  const daysElapsed = Math.max(1, Math.round((end - start) / 86400000) + 1);
  return currentTotal.value / daysElapsed;
});

const maxDay = computed(() => {
  const totals = {};
  for (const e of currentCycleExpenses.value) {
    totals[e.date] = (totals[e.date] || 0) + e.amount;
  }
  let best = null;
  for (const [date, total] of Object.entries(totals)) {
    if (!best || total > best.total) best = { date, total };
  }
  return best;
});

const categoryBreakdown = computed(() => {
  const totals = {};
  for (const e of currentCycleExpenses.value) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  }
  const total = currentTotal.value || 1;
  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount, percent: Math.round((amount / total) * 100) }))
    .sort((a, b) => b.amount - a.amount);
});

const pieChartData = computed(() => ({
  labels: categoryBreakdown.value.map((c) => c.category),
  datasets: [
    {
      data: categoryBreakdown.value.map((c) => c.amount),
      backgroundColor: CATEGORY_COLORS
    }
  ]
}));

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { color: CHART_TEXT_COLOR } },
    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.parsed)}` } }
  }
};

const dailyChartData = computed(() => {
  const totals = {};
  for (const e of currentCycleExpenses.value) totals[e.date] = (totals[e.date] || 0) + e.amount;

  const labels = [];
  const data = [];
  const cursor = new Date(cycleRange.value.start);
  while (cursor <= cycleRange.value.end) {
    labels.push(String(cursor.getDate()));
    data.push(totals[dateKey(cursor)] || 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  return { labels, datasets: [{ label: 'Gasto', data, backgroundColor: '#2fb88a' }] };
});

const dailyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => fmt(ctx.parsed.y) } }
  },
  scales: {
    x: { ticks: { color: CHART_TEXT_COLOR }, grid: { color: CHART_GRID_COLOR } },
    y: { ticks: { color: CHART_TEXT_COLOR }, grid: { color: CHART_GRID_COLOR } }
  }
};

async function onQueryRange() {
  if (!rangeFrom.value || !rangeTo.value) return;
  rangeLoading.value = true;
  const expenses = await expensesStore.queryRange(rangeFrom.value, rangeTo.value);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totals = {};
  for (const e of expenses) totals[e.category] = (totals[e.category] || 0) + e.amount;
  const breakdown = Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  rangeResult.value = { total, breakdown, count: expenses.length };
  rangeLoading.value = false;
}

async function onSaveSettings() {
  savingSettings.value = true;
  await settingsStore.save(Number(salaryInput.value), Number(payDayInput.value));
  await loadCycleData();
  savingSettings.value = false;
}
</script>

<template>
  <div class="dashboard">
    <h1 class="dashboardTitle">Resumen</h1>

    <div v-if="alertLevel" class="alertBanner" :class="alertLevel">
      Llevas <strong>{{ budgetPercent }}%</strong> de tu presupuesto del ciclo actual.
    </div>

    <div class="kpiGrid">
      <div class="kpiCard">
        <span class="kpiLabel">Gastado en el ciclo</span>
        <span class="kpiValue">{{ fmt(currentTotal) }}</span>
      </div>
      <div class="kpiCard">
        <span class="kpiLabel">Presupuesto usado</span>
        <span class="kpiValue">{{ budgetPercent }}%</span>
      </div>
      <div class="kpiCard">
        <span class="kpiLabel">Disponible</span>
        <span class="kpiValue">{{ fmt(remaining) }}</span>
      </div>
      <div class="kpiCard">
        <span class="kpiLabel">Promedio diario</span>
        <span class="kpiValue">{{ fmt(dailyAverage) }}</span>
      </div>
      <div class="kpiCard">
        <span class="kpiLabel">Día de mayor gasto</span>
        <span class="kpiValue">{{ maxDay ? fmt(maxDay.total) : '—' }}</span>
      </div>
      <div class="kpiCard">
        <span class="kpiLabel">Ciclo anterior</span>
        <span class="kpiValue">{{ fmt(previousCycleTotal) }}</span>
      </div>
    </div>

    <section class="dashboardSection">
      <h2>Por categoría (ciclo actual)</h2>
      <div v-if="categoryBreakdown.length === 0" class="emptyHint">Sin gastos registrados todavía.</div>
      <div v-else class="chartBox">
        <Pie :data="pieChartData" :options="pieChartOptions" />
      </div>
    </section>

    <section class="dashboardSection">
      <h2>Gasto por día (ciclo actual)</h2>
      <div v-if="currentCycleExpenses.length === 0" class="emptyHint">Sin gastos registrados todavía.</div>
      <div v-else class="chartBox">
        <Bar :data="dailyChartData" :options="dailyChartOptions" />
      </div>
    </section>

    <section class="dashboardSection">
      <h2>Consultar por fechas</h2>
      <div class="rangeForm">
        <input v-model="rangeFrom" type="date">
        <span>a</span>
        <input v-model="rangeTo" type="date">
        <button @click="onQueryRange" :disabled="rangeLoading">Consultar</button>
      </div>
      <div v-if="rangeResult" class="rangeResult">
        <p>Total: <strong>{{ fmt(rangeResult.total) }}</strong> ({{ rangeResult.count }} gastos)</p>
        <div v-for="c in rangeResult.breakdown" :key="c.category" class="rangeBreakdownRow">
          <span>{{ c.category }}</span>
          <span>{{ fmt(c.amount) }}</span>
        </div>
      </div>
    </section>

    <section class="dashboardSection">
      <h2>Configurar presupuesto</h2>
      <div class="settingsForm">
        <label>
          Salario mensual
          <input v-model="salaryInput" type="number" min="0" step="any">
        </label>
        <label>
          Día de pago
          <input v-model="payDayInput" type="number" min="1" max="28">
        </label>
        <button @click="onSaveSettings" :disabled="savingSettings">Guardar</button>
      </div>
    </section>
  </div>
</template>
