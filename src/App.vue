<script setup>
import { onMounted, watch } from 'vue';
import { useAuthStore } from './stores/auth';
import { useExpensesStore } from './stores/expenses';
import LoginView from './views/LoginView.vue';
import CalendarView from './views/CalendarView.vue';

const auth = useAuthStore();
const expensesStore = useExpensesStore();

onMounted(() => auth.listen());
watch(() => auth.user, (user) => {
  if (!user) expensesStore.stopWatching();
});
</script>

<template>
  <CalendarView v-if="auth.ready && auth.user" />
  <LoginView v-else-if="auth.ready" />
</template>
