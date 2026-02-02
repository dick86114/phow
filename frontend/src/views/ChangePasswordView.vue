<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'
import { Lock, KeyRound } from 'lucide-vue-next'

const router = useRouter()
const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }
  
  loading.value = true
  error.value = ''

  try {
    const token = localStorage.getItem('token')
    await axios.post('/api/user/change-password', {
      oldPassword: form.value.oldPassword,
      newPassword: form.value.newPassword
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    toast.success('密码修改成功，请重新登录')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  } catch (e: any) {
    error.value = e.response?.data?.message || '修改失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-20">
    <div class="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden p-8">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound class="w-8 h-8 text-indigo-500" />
        </div>
        <h1 class="text-2xl font-bold">修改密码</h1>
        <p class="text-neutral-400 mt-2">为了账号安全，请定期更换密码</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-2">
          <label class="text-sm font-bold text-neutral-400">当前密码</label>
          <div class="relative">
            <input 
              v-model="form.oldPassword"
              type="password"
              required
              class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 pl-10 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="输入当前使用的密码"
            />
            <Lock class="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-bold text-neutral-400">新密码</label>
          <div class="relative">
            <input 
              v-model="form.newPassword"
              type="password"
              required
              minlength="6"
              class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 pl-10 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="设置新密码（至少6位）"
            />
            <Lock class="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-bold text-neutral-400">确认新密码</label>
          <div class="relative">
            <input 
              v-model="form.confirmPassword"
              type="password"
              required
              class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 pl-10 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="再次输入新密码"
            />
            <Lock class="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
          </div>
        </div>

        <div v-if="error" class="bg-rose-500/10 text-rose-500 p-3 rounded-lg text-sm text-center">
          {{ error }}
        </div>

        <div class="flex gap-4 pt-2">
          <button 
            type="button" 
            @click="router.back()"
            class="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-3 rounded-xl font-bold transition-all"
          >
            取消
          </button>
          <button 
            type="submit"
            :disabled="loading"
            class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:cursor-not-allowed py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            {{ loading ? '提交中...' : '确认修改' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
