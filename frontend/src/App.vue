<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { LogIn, LogOut, Upload, User, ChevronDown, Lock, Sun, Moon, Monitor } from 'lucide-vue-next'

const auth = useAuthStore()
const isDropdownOpen = ref(false)
const isThemeOpen = ref(false)
const theme = ref(localStorage.getItem('theme') || 'system')

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
  isThemeOpen.value = false
}

const closeDropdown = () => {
  isDropdownOpen.value = false
  isThemeOpen.value = false
}

const toggleThemeMenu = () => {
  isThemeOpen.value = !isThemeOpen.value
  isDropdownOpen.value = false
}

const updateThemeClass = () => {
  const isDark = theme.value === 'dark' || (theme.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

const setTheme = (t: string) => {
  theme.value = t
  localStorage.setItem('theme', t)
  updateThemeClass()
  isThemeOpen.value = false
}

onMounted(() => {
  updateThemeClass()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme.value === 'system') updateThemeClass()
  })
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100" @click="closeDropdown">
    <header class="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800">
      <nav class="container mx-auto px-4 h-16 flex items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2 text-xl font-bold tracking-tighter">
          <img src="/logo.png" alt="PHOW Logo" class="w-8 h-8 object-contain" />
          <span>PHOW</span>
        </RouterLink>

        <div class="flex items-center gap-6">
          <template v-if="auth.isAdmin">
            <RouterLink to="/upload" class="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Upload class="w-4 h-4" />
              <span>上传</span>
            </RouterLink>
          </template>
          
          <div class="h-4 w-px bg-gray-300 dark:bg-neutral-700"></div>

          <!-- Theme Toggle -->
          <div class="relative" @click.stop>
            <button 
              @click="toggleThemeMenu"
              class="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none p-1"
              title="切换主题"
            >
              <Sun v-if="theme === 'light'" class="w-5 h-5" />
              <Moon v-else-if="theme === 'dark'" class="w-5 h-5" />
              <Monitor v-else class="w-5 h-5" />
            </button>

            <!-- Theme Dropdown -->
            <div 
              v-if="isThemeOpen" 
              class="absolute right-0 mt-2 w-32 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-xl py-1 overflow-hidden z-50"
            >
              <button 
                v-for="t in ['light', 'dark', 'system']" 
                :key="t"
                @click="setTheme(t)"
                class="flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800"
                :class="theme === t ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-neutral-300'"
              >
                <Sun v-if="t === 'light'" class="w-4 h-4" />
                <Moon v-else-if="t === 'dark'" class="w-4 h-4" />
                <Monitor v-else class="w-4 h-4" />
                <span>{{ t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统' }}</span>
              </button>
            </div>
          </div>

          <div class="h-4 w-px bg-neutral-700"></div>

          <template v-if="auth.isAuthenticated">
            <div class="relative" @click.stop>
              <button 
                @click="toggleDropdown" 
                class="flex items-center gap-2 hover:text-indigo-400 transition-colors focus:outline-none"
              >
                <User class="w-4 h-4" />
                <span>{{ auth.user?.username }}</span>
                <ChevronDown class="w-3 h-3 transition-transform" :class="{ 'rotate-180': isDropdownOpen }" />
              </button>

              <!-- Dropdown Menu -->
              <div 
                v-if="isDropdownOpen" 
                class="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl py-1 overflow-hidden"
              >
                <RouterLink 
                  to="/change-password" 
                  class="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                  @click="closeDropdown"
                >
                  <Lock class="w-4 h-4" />
                  修改密码
                </RouterLink>
                <div class="h-px bg-neutral-800 my-1"></div>
                <button 
                  @click="auth.logout" 
                  class="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-neutral-800 hover:text-red-300 transition-colors text-left"
                >
                  <LogOut class="w-4 h-4" />
                  退出登录
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <RouterLink to="/login" class="flex items-center gap-1 hover:text-indigo-400 transition-colors">
              <LogIn class="w-4 h-4" />
              <span>登录</span>
            </RouterLink>
          </template>
        </div>
      </nav>
    </header>

    <main class="container mx-auto px-4 py-8">
      <RouterView />
    </main>

    <footer class="border-t border-neutral-800 py-8 text-center text-neutral-500 text-sm">
      <p>&copy; 2026 PHOW. 个人摄影分享网站</p>
    </footer>
  </div>
</template>

<style>
@import "./style.css";
</style>
