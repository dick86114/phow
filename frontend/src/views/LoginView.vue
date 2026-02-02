<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { LogIn, User, Lock, AlertCircle } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-20">
    <div class="bg-neutral-900 rounded-2xl p-8 shadow-2xl border border-neutral-800">
      <div class="text-center mb-8">
        <div class="inline-flex p-4 bg-indigo-500/10 rounded-full text-indigo-500 mb-4">
          <LogIn class="w-8 h-8" />
        </div>
        <h1 class="text-2xl font-bold">欢迎回来</h1>
        <p class="text-neutral-500 mt-2 text-sm">登录以管理你的作品和查看私密照片</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div v-if="error" class="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle class="w-4 h-4" />
          <span>{{ error }}</span>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-bold text-neutral-400 flex items-center gap-2">
            <User class="w-4 h-4" /> 用户名
          </label>
          <input 
            v-model="username"
            type="text"
            required
            class="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="输入你的用户名"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-bold text-neutral-400 flex items-center gap-2">
            <Lock class="w-4 h-4" /> 密码
          </label>
          <input 
            v-model="password"
            type="password"
            required
            class="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="输入你的密码"
          />
        </div>

        <button 
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          <span v-if="loading" class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
          <span>{{ loading ? '登录中...' : '立即登录' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
