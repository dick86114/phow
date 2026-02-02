<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useRouter, useRoute } from 'vue-router'
import CalendarHeatmap from '../components/CalendarHeatmap.vue'
import dayjs from 'dayjs'
import { X } from 'lucide-vue-next'

interface Photo {
  id: number;
  thumbUrl: string;
  title: string;
  description: string;
  camera: string;
  createdAt: string;
}

const photos = ref<Photo[]>([])
const loading = ref(true)
const viewMode = ref<'grid' | 'masonry'>('masonry')
const router = useRouter()
const route = useRoute()

onMounted(async () => {
  try {
    const response = await axios.get('/api/photos')
    photos.value = response.data
  } catch (error) {
    console.error('Failed to fetch photos', error)
  } finally {
    loading.value = false
  }
})

const filteredPhotos = computed(() => {
  const date = route.query.date as string
  if (!date) return photos.value
  
  return photos.value.filter(photo => {
    return dayjs(photo.createdAt).format('YYYY-MM-DD') === date
  })
})

const clearFilter = () => {
  router.push({ path: '/' })
}

const goToDetail = (id: number) => {
  router.push(`/photo/${id}`)
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
    <div class="lg:col-span-3">
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <div v-if="!loading && photos.length > 0" class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
           <div v-if="route.query.date" class="flex items-center gap-2 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1.5 rounded-lg border dark:border-indigo-500/30">
             <span class="text-sm font-medium">📅 {{ route.query.date }}</span>
             <button @click="clearFilter" class="hover:text-indigo-900 dark:hover:text-white transition-colors">
               <X class="w-4 h-4" />
             </button>
           </div>
        </div>

        <div class="bg-white dark:bg-neutral-900 p-1 rounded-lg border border-gray-200 dark:border-neutral-800 flex gap-1">
          <button 
            @click="viewMode = 'grid'"
            class="p-2 rounded-md transition-all"
            :class="viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800'"
            title="网格模式 (1:1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button 
            @click="viewMode = 'masonry'"
            class="p-2 rounded-md transition-all"
            :class="viewMode === 'masonry' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800'"
            title="瀑布流模式 (原比例)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-6a2 2 0 01-2-2V4z" /> <!-- Fallback icon -->
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm8-1a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1V4a1 1 0 011-1h4zm-9 7a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <div v-if="!loading" :class="viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'columns-1 sm:columns-2 xl:columns-3 gap-4'">
        <div 
          v-for="photo in filteredPhotos" 
          :key="photo.id" 
          class="group relative cursor-pointer overflow-hidden rounded-xl bg-white dark:bg-neutral-900 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 break-inside-avoid"
          :class="viewMode === 'masonry' ? 'mb-4' : ''"
          @click="goToDetail(photo.id)"
        >
          <img 
            :src="photo.thumbUrl" 
            :alt="photo.title"
            class="w-full transition-transform duration-500 group-hover:scale-110"
            :class="viewMode === 'grid' ? 'aspect-square object-cover' : 'h-auto'"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
            <h3 class="font-bold text-lg leading-tight text-white">{{ photo.title }}</h3>
            <!-- Removed description -->
            <div class="flex items-center gap-2 mt-3">
              <span class="text-xs px-2 py-1 bg-white/10 text-white rounded-full backdrop-blur-sm">
                {{ photo.camera || '未知器材' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && photos.length === 0" class="text-center py-20 text-gray-500 dark:text-neutral-500">
        <p>还没有作品，快去上传吧！</p>
      </div>
    </div>

    <!-- Sidebar -->
    <aside class="space-y-6">
      <CalendarHeatmap />
      
      <div class="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-gray-200 dark:border-neutral-800 shadow-xl">
        <h3 class="font-bold text-sm text-gray-500 dark:text-neutral-400 mb-4">关于本站</h3>
        <p class="text-sm text-gray-600 dark:text-neutral-500 leading-relaxed">
          PHOW 是一个专注于记录与分享摄影点滴的私密空间。在这里，每一张照片都是一段独特的故事。
        </p>
      </div>
    </aside>
  </div>
</template>
