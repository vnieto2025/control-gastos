<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const mode = ref('login');
const email = ref('');
const password = ref('');
const submitting = ref(false);

async function onSubmit() {
  submitting.value = true;
  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value);
    } else {
      await auth.register(email.value, password.value);
    }
  } catch (e) {
    // error already set in store
  } finally {
    submitting.value = false;
  }
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  auth.error = '';
}
</script>

<template>
  <div class="loginScreen">
    <div class="loginCard">
      <h1>Control de Gastos</h1>
      <p class="loginSubtitle">
        {{ mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta' }}
      </p>

      <form class="loginForm" @submit.prevent="onSubmit">
        <input v-model="email" type="email" placeholder="Correo" required autocomplete="email">
        <input v-model="password" type="password" placeholder="Contraseña" required minlength="6" autocomplete="current-password">
        <p v-if="auth.error" class="loginError">{{ auth.error }}</p>
        <button type="submit" :disabled="submitting">
          {{ mode === 'login' ? 'Entrar' : 'Registrarme' }}
        </button>
      </form>

      <button class="toggleAuthMode" @click="toggleMode">
        {{ mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión' }}
      </button>
    </div>
  </div>
</template>
