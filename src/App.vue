<script setup>
import { onMounted, watch, ref } from 'vue';
import { useAuthStore } from './stores/auth';
import { useExpensesStore } from './stores/expenses';
import LoginView from './views/LoginView.vue';
import CalendarView from './views/CalendarView.vue';
import DashboardView from './views/DashboardView.vue';

const auth = useAuthStore();
const expensesStore = useExpensesStore();
const activeTab = ref('calendar');

onMounted(() => auth.listen());
watch(() => auth.user, (user) => {
  if (!user) expensesStore.stopWatching();
});
</script>

<template>
  <template v-if="auth.ready && auth.user">
    <CalendarView v-if="activeTab === 'calendar'" />
    <DashboardView v-else />

    <nav class="bottomNav">
      <button :class="{ active: activeTab === 'calendar' }" @click="activeTab = 'calendar'">
        📅 Calendario
      </button>
      <button :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">
        📊 Resumen
      </button>
    </nav>
  </template>
  <LoginView v-else-if="auth.ready" />
</template>
