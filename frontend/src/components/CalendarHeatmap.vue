<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { useRouter } from 'vue-router'

dayjs.locale('zh-cn')

const router = useRouter()
const activity = ref<Record<string, number>>({})
const loading = ref(true)
const currentDate = ref(dayjs())

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// GitHub uses a 5-step color scale
const getLevel = (count: number) => {
  if (count === 0) return 'bg-gray-100 dark:bg-neutral-800'
  if (count <= 1) return 'bg-indigo-200 dark:bg-indigo-900' // low
  if (count <= 3) return 'bg-indigo-400 dark:bg-indigo-700' // medium
  if (count <= 5) return 'bg-indigo-600 dark:bg-indigo-500' // high
  return 'bg-indigo-800 dark:bg-indigo-300'                 // very high
}

onMounted(async () => {
  try {
    const response = await axios.get('/api/photos/activity')
    activity.value = response.data
  } catch (error) {
    console.error('Failed to fetch activity', error)
  } finally {
    loading.value = false
  }
})

const changeMonth = (delta: number) => {
  currentDate.value = currentDate.value.add(delta, 'month')
}

// Generate calendar grid for current month
const calendarDays = computed(() => {
  const startOfMonth = currentDate.value.startOf('month')
  const endOfMonth = currentDate.value.endOf('month')
  const startDay = startOfMonth.day() // 0 (Sunday) to 6 (Saturday)
  
  const days = []
  
  // Padding for previous month
  for (let i = 0; i < startDay; i++) {
    days.push({
      date: '',
      fullDate: '',
      count: 0,
      level: 'bg-transparent',
      title: '',
      isEmpty: true
    })
  }
  
  // Current month days
  for (let i = 1; i <= endOfMonth.date(); i++) {
    const date = startOfMonth.date(i)
    const dateStr = date.format('YYYY-MM-DD')
    const count = activity.value[dateStr] || 0
    
    days.push({
      date: i,
      fullDate: dateStr,
      count: count,
      level: getLevel(count),
      title: `${dateStr}: ${count} 张照片`,
      isEmpty: false
    })
  }
  
  return days
})

const handleClick = (dateStr: string, count: number) => {
  if (count > 0) {
    router.push({ path: '/', query: { date: dateStr } })
  }
}
</script>

<template>
  <div class="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-gray-200 dark:border-neutral-800 shadow-xl">
    <!-- Header with controls -->
    <h3 class="font-bold text-sm text-gray-500 dark:text-neutral-400 mb-4 flex items-center justify-between">
      <button 
        @click="changeMonth(-1)"
        class="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <span class="font-bold text-gray-900 dark:text-white">{{ currentDate.format('YYYY年M月') }}</span>
      
      <button 
        @click="changeMonth(1)"
        class="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        :disabled="currentDate.isAfter(dayjs(), 'month')"
        :class="{ 'opacity-30 cursor-not-allowed': currentDate.isAfter(dayjs(), 'month') }"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </h3>
    
    <div v-if="loading" class="h-48 flex items-center justify-center">
      <div class="animate-pulse flex space-x-2">
        <div v-for="i in 3" :key="i" class="h-3 w-3 bg-gray-200 dark:bg-neutral-800 rounded-sm"></div>
      </div>
    </div>
    
    <div v-else class="flex flex-col gap-2">
      <!-- Weekday Headers -->
      <div class="grid grid-cols-7 gap-1 mb-1">
        <div 
          v-for="day in weekDays" 
          :key="day"
          class="text-center text-[10px] text-gray-400 dark:text-neutral-600 font-medium"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-1">
        <div 
          v-for="(day, index) in calendarDays" 
          :key="index"
          class="aspect-square rounded-md flex items-center justify-center relative group"
          :class="[
            day.isEmpty ? 'bg-transparent' : (day.count > 0 ? 'cursor-pointer hover:ring-1 hover:ring-indigo-500/50 dark:hover:ring-white/50 transition-all' : 'cursor-default'),
            day.level
          ]"
          @click="!day.isEmpty && day.count > 0 && handleClick(day.fullDate, day.count)"
        >
          <span v-if="!day.isEmpty" class="text-[10px] text-gray-500/50 dark:text-white/50 group-hover:text-gray-900 dark:group-hover:text-white/90 font-medium z-10">
            {{ day.date }}
          </span>
          <!-- Custom Tooltip -->
          <div v-if="!day.isEmpty" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white dark:bg-neutral-800 text-xs text-gray-900 dark:text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border border-gray-200 dark:border-neutral-700 shadow-xl">
             {{ day.fullDate }}: {{ day.count }} 张照片
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-4 flex items-center justify-between text-[10px] text-gray-500 dark:text-neutral-500">
        <div class="flex gap-1 items-center">
          <span>总计: {{ calendarDays.reduce((acc, day) => acc + (day.count || 0), 0) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span>Less</span>
          <div class="flex gap-1">
            <div class="w-2.5 h-2.5 rounded-[2px] bg-gray-100 dark:bg-neutral-800"></div>
            <div class="w-2.5 h-2.5 rounded-[2px] bg-indigo-200 dark:bg-indigo-900"></div>
            <div class="w-2.5 h-2.5 rounded-[2px] bg-indigo-400 dark:bg-indigo-700"></div>
            <div class="w-2.5 h-2.5 rounded-[2px] bg-indigo-600 dark:bg-indigo-500"></div>
            <div class="w-2.5 h-2.5 rounded-[2px] bg-indigo-800 dark:bg-indigo-300"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  </div>
</template>
