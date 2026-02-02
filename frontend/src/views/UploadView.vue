<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { toast } from 'vue3-toastify'
import { Upload, X, Camera, MapPin, AlignLeft, Eye, Info, Sparkles, Clock, Aperture, Settings } from 'lucide-vue-next'

const router = useRouter()
const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const form = ref<Record<string, string>>({
  title: '',
  description: '',
  location: '',
  lens: '',
  camera: '',
  story: '',
  takenAt: '',
  iso: '',
  aperture: '',
  shutter: '',
  focalLength: '',
  exif: '', // Hidden field to store full EXIF JSON if needed
  visibility: 'PUBLIC'
})
const uploading = ref(false)
const analyzing = ref(false)

const onFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const selectedFile = target.files?.[0]
  if (selectedFile) {
    file.value = selectedFile
    previewUrl.value = URL.createObjectURL(selectedFile)
    console.log('File selected:', selectedFile.name, selectedFile.size)
    
    // Auto-extract metadata
    await extractMetadata(selectedFile)
  }
}

const extractMetadata = async (file: File) => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return

    const formData = new FormData()
    formData.append('file', file)

    const { data } = await axios.post('/api/photos/extract-metadata', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    })

    console.log('Metadata extracted:', data)
    
    if (data.cameraModel) form.value.camera = data.cameraModel
    if (data.lensModel) form.value.lens = data.lensModel
    if (data.location) form.value.location = data.location
    if (data.takenAt) {
      // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
      const date = new Date(data.takenAt)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      form.value.takenAt = `${year}-${month}-${day}T${hours}:${minutes}`
    }
    if (data.exifData) {
      form.value.exif = JSON.stringify(data.exifData)
      if (data.exifData.ISO) form.value.iso = data.exifData.ISO.toString()
      if (data.exifData.FNumber) form.value.aperture = `f/${data.exifData.FNumber}`
      if (data.exifData.ExposureTime) {
         const val = data.exifData.ExposureTime
         form.value.shutter = val >= 1 ? `${val}s` : `1/${Math.round(1/val)}s`
      }
      if (data.exifData.FocalLength) form.value.focalLength = data.exifData.FocalLength.toString()
    }
  } catch (error) {
    console.error('Failed to extract metadata', error)
    toast.error('读取照片信息失败')
  }
}

const analyzeWithAi = async () => {
  if (!file.value) return
  analyzing.value = true
  try {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file.value)

    const { data } = await axios.post('/api/ai/analyze-upload', formData, {
       headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('AI Analysis:', data)
    
    if (data.camera) form.value.camera = data.camera
    if (data.lens) form.value.lens = data.lens
    if (data.location) form.value.location = data.location
    if (data.takenAt) {
      // Try to parse and format date
      try {
        const date = new Date(data.takenAt)
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          form.value.takenAt = `${year}-${month}-${day}T${hours}:${minutes}`
        } else {
          form.value.takenAt = data.takenAt // Fallback if parsing fails
        }
      } catch (e) {
        form.value.takenAt = data.takenAt
      }
    }
    if (data.story) form.value.story = data.story
    if (data.iso) form.value.iso = data.iso
    if (data.aperture) form.value.aperture = data.aperture
    if (data.shutter) form.value.shutter = data.shutter
    // Note: AI currently doesn't explicitly return focalLength, but if it did:
    // if (data.focalLength) form.value.focalLength = data.focalLength
    
    // Merge into EXIF if needed, or just rely on form fields being sent
    // We update the hidden exif field to include AI derived data so it persists
    let currentExif = form.value.exif ? JSON.parse(form.value.exif) : {}
    currentExif = {
      ...currentExif,
      ISO: data.iso ? parseInt(data.iso) : currentExif.ISO,
      FNumber: data.aperture ? parseFloat(data.aperture.replace('f/', '')) : currentExif.FNumber,
      // ExposureTime is tricky to parse back from string "1/100s" to number, let's skip for now or try
    }
    form.value.exif = JSON.stringify(currentExif)

    toast.success('AI 识别完成')
  } catch (error) {
    console.error('AI analysis failed', error)
    toast.error('AI 识别失败')
  } finally {
    analyzing.value = false
  }
}

const removeFile = () => {
  file.value = null
  previewUrl.value = null
}

const handleSubmit = async () => {
  console.log('Submit triggered')
  if (!file.value) {
    toast.warning('请选择一张照片')
    return
  }
  if (!form.value.title) {
    toast.warning('请输入标题')
    return
  }

  uploading.value = true
  const formData = new FormData()
  formData.append('file', file.value)
  Object.keys(form.value).forEach(key => {
    const value = form.value[key]
    if (value) {
      formData.append(key, value)
    }
  })

  try {
    const token = localStorage.getItem('token')
    console.log('Uploading with token:', token ? 'Token exists' : 'No token')
    
    if (!token) {
      toast.error('未登录或登录已过期，请重新登录')
      router.push('/login')
      return
    }

    const response = await axios.post('/api/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    })
    console.log('Upload success:', response.data)
    toast.success('发布成功！')
    router.push('/')
  } catch (error: any) {
    console.error('Upload failed', error)
    if (error.response) {
      toast.error(`上传失败: ${error.response.status} ${error.response.data.message || ''}`)
    } else {
      toast.error('上传失败，网络错误或服务器无响应')
    }
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden">
    <div class="p-8 border-b border-neutral-800 bg-neutral-800/50">
      <h1 class="text-2xl font-bold">分享新作品</h1>
      <p class="text-neutral-400 text-sm mt-1">记录并分享你眼中的世界</p>
    </div>

    <form @submit.prevent="handleSubmit" class="p-8 space-y-8">
      <!-- File Upload -->
      <div class="space-y-4">
        <label class="block text-sm font-bold text-neutral-400 uppercase tracking-wider">照片文件</label>
        <div v-if="!previewUrl" class="relative group">
          <input 
            type="file" 
            accept="image/*" 
            @change="onFileChange"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div class="h-64 border-2 border-dashed border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-4 bg-neutral-800/30 transition-colors group-hover:border-indigo-500/50 group-hover:bg-neutral-800/50">
            <div class="p-4 bg-neutral-800 rounded-full text-neutral-500">
              <Upload class="w-8 h-8" />
            </div>
            <div class="text-center">
              <p class="font-medium">点击或拖拽照片到这里</p>
              <p class="text-xs text-neutral-500 mt-1">支持 JPG, PNG, WebP 格式</p>
            </div>
          </div>
        </div>
        
        <div v-else class="relative h-96 rounded-xl overflow-hidden group bg-neutral-900 flex items-center justify-center border border-neutral-800">
          <img :src="previewUrl" class="max-w-full max-h-full object-contain" />
          
          <!-- Top Right Actions -->
          <div class="absolute top-4 right-4 flex items-center gap-2 z-20">
             <button 
              type="button"
              @click="removeFile"
              class="p-2.5 bg-black/60 hover:bg-rose-500 text-white rounded-full backdrop-blur-md transition-all duration-300 shadow-lg hover:scale-105 group/btn"
              title="删除照片"
            >
              <X class="w-5 h-5 group-hover/btn:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          <!-- Bottom Actions -->
          <div class="absolute bottom-4 right-4 left-4 flex justify-end items-center gap-3 z-20">
            <button 
              type="button"
              @click="analyzeWithAi"
              :disabled="analyzing"
              class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full backdrop-blur-md transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 border border-white/10"
            >
              <Sparkles class="w-4 h-4" :class="{ 'animate-spin': analyzing }" />
              <span class="font-medium tracking-wide">{{ analyzing ? 'AI 识别中...' : 'AI 智能识别' }}</span>
            </button>
          </div>
          
          <!-- Gradient Overlay for text readability -->
          <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10"></div>
        </div>
      </div>

      <!-- Form Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-neutral-400">
            <Info class="w-4 h-4" /> 标题 *
          </label>
          <input 
            v-model="form.title"
            required
            placeholder="为你的作品起个名字"
            class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
          />
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-neutral-400">
            <Clock class="w-4 h-4" /> 拍摄时间
          </label>
          <input 
            v-model="form.takenAt"
            type="datetime-local"
            class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
          />
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-neutral-400">
            <Camera class="w-4 h-4" /> 相机
          </label>
          <input 
            v-model="form.camera"
            placeholder="例如: Xiaomi 17 Ultra"
            class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
          />
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-neutral-400">
            <Aperture class="w-4 h-4" /> 镜头
          </label>
          <input 
            v-model="form.lens"
            placeholder="例如: 75mm f/1.8"
            class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
          />
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-neutral-400">
            <Settings class="w-4 h-4" /> 拍摄参数
          </label>
          <div class="grid grid-cols-3 gap-2">
            <input 
              v-model="form.iso"
              placeholder="ISO"
              class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
            />
            <input 
              v-model="form.aperture"
              placeholder="光圈"
              class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
            />
            <input 
              v-model="form.shutter"
              placeholder="快门"
              class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-neutral-400">
            <MapPin class="w-4 h-4" /> 地点
          </label>
          <input 
            v-model="form.location"
            placeholder="拍摄于哪里？"
            class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
          />
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-neutral-400">
            <Eye class="w-4 h-4" /> 可见性
          </label>
          <select 
            v-model="form.visibility"
            class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none text-gray-900 dark:text-white"
          >
            <option value="PUBLIC">公开展示</option>
            <option value="PRIVATE">仅家人可见</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-neutral-400">
            <Aperture class="w-4 h-4" /> 焦距
          </label>
          <input 
            v-model="form.focalLength"
            placeholder="例如: 23 (mm)"
            class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
          />
        </div>

        <div class="md:col-span-2 space-y-2">
          <label class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-neutral-400">
            <AlignLeft class="w-4 h-4" /> 故事
          </label>
          <textarea 
            v-model="form.story"
            rows="4"
            placeholder="分享照片背后的故事..."
            class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
          ></textarea>
        </div>
      </div>

      <div class="pt-6 border-t border-gray-200 dark:border-neutral-800 flex justify-end">
        <button 
          type="submit"
          :disabled="uploading"
          class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 text-white"
        >
          {{ uploading ? '上传中...' : '发布作品' }}
        </button>
      </div>
    </form>
  </div>
</template>
