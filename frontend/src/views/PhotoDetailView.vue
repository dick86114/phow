<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { toast } from 'vue3-toastify'
import { 
  ArrowLeft, Camera, Calendar, MapPin, 
  Info, Heart, MessageCircle, User as UserIcon, Trash2,
  Edit, Save, X, Settings, Sparkles, Download
} from 'lucide-vue-next'
import dayjs from 'dayjs'
import { useAuthStore } from '../stores/auth'
import ConfirmModal from '../components/ConfirmModal.vue'

interface Photo {
  id: number;
  url: string;
  title: string;
  story: string;
  description: string;
  camera: string;
  lens: string;
  exif: {
    FNumber?: number | string;
    ExposureTime?: number | string;
    ISO?: number | string;
    FocalLength?: number | string;
    DateTimeOriginal?: string;
  } | null;
  createdAt: string;
  location: string;
  user: {
    username: string;
  };
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    username: string;
  } | null;
  nickname: string | null;
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const photo = ref<Photo | null>(null)
const comments = ref<Comment[]>([])
const likeCount = ref(0)
const loading = ref(true)
const commentContent = ref('')
const submittingComment = ref(false)
const showCommentForm = ref(false)

// Edit Mode State
const isEditing = ref(false)
const saving = ref(false)
const analyzing = ref(false)
const editForm = ref({
  title: '',
  // description removed
  story: '',
  camera: '',
  lens: '',
  location: '',
  iso: '',
  aperture: '',
  shutter: '',
  focalLength: '',
  takenAt: ''
})

const formatExposureTime = (val: number | string | undefined) => {
  if (!val) return '-'
  if (typeof val === 'string') return val
  if (val >= 1) return val
  return `1/${Math.round(1/val)}`
}

const formatAperture = (val: number | string | undefined) => {
  if (!val) return '-'
  if (typeof val === 'string') return val.replace(/^f\//, '')
  return val
}

const getPhotoId = () => {
  const id = route.params.id
  return Array.isArray(id) ? id[0] : id
}

const fetchPhoto = async () => {
  try {
    const response = await axios.get(`/api/photos/${getPhotoId()}`)
    photo.value = response.data
  } catch (error) {
    console.error('Failed to fetch photo detail', error)
  }
}

const fetchComments = async () => {
  try {
    const response = await axios.get(`/api/comments/photo/${getPhotoId()}`)
    comments.value = response.data
  } catch (error) {
    console.error('Failed to fetch comments', error)
  }
}

const fetchLikeCount = async () => {
  try {
    const response = await axios.get(`/api/likes/${getPhotoId()}/count`)
    likeCount.value = response.data
  } catch (error) {
    console.error('Failed to fetch like count', error)
  }
}

const handleLike = async () => {
  try {
    await axios.post(`/api/likes/${getPhotoId()}`)
    await fetchLikeCount()
    toast.success('点赞成功！')
  } catch (error: any) {
    if (error.response?.data?.message) {
      toast.error(error.response.data.message)
    } else {
      toast.error('点赞失败，请稍后重试')
    }
  }
}

const showDeleteModal = ref(false)
const deleteType = ref<'photo' | 'comment'>('photo')
const deleteTargetId = ref<number | null>(null)
const deleteLoading = ref(false)

const handleDeletePhoto = () => {
  deleteType.value = 'photo'
  showDeleteModal.value = true
}

const handleDeleteComment = (commentId: number) => {
  deleteType.value = 'comment'
  deleteTargetId.value = commentId
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  deleteLoading.value = true
  try {
    const token = localStorage.getItem('token')
    
    if (deleteType.value === 'photo') {
      await axios.delete(`/api/photos/${getPhotoId()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      toast.success('照片已删除')
      router.push('/')
    } else {
      if (deleteTargetId.value) {
        await axios.delete(`/api/comments/${deleteTargetId.value}`, {
           headers: { 'Authorization': `Bearer ${token}` }
        })
        await fetchComments()
        toast.success('评论已删除')
      }
    }
    showDeleteModal.value = false
  } catch (error) {
    console.error('Delete failed', error)
    toast.error('删除失败，请稍后重试')
  } finally {
    deleteLoading.value = false
  }
}

const handleComment = async () => {
  if (!commentContent.value.trim()) return
  
  submittingComment.value = true
  try {
    await axios.post('/api/comments', {
      content: commentContent.value,
      photoId: Number(getPhotoId()),
      // If user is not logged in, these might be needed if the backend requires them, 
      // but typically we restrict comments to logged in users or allow anon. 
      // The backend CommentService creates comment with userId from req.user if available.
      // If auth.isAuthenticated is false, we might need to handle anonymous comments differently 
      // or prompt login. The current backend CommentController uses @OptionalJwtAuthGuard.
      nickname: auth.user?.username || '匿名用户' 
    })
    commentContent.value = ''
    showCommentForm.value = false
    await fetchComments()
    toast.success('评论成功！')
  } catch (error) {
    console.error('Comment failed', error)
    toast.error('评论失败，请重试')
  } finally {
    submittingComment.value = false
  }
}

const startEdit = () => {
  if (!photo.value) return
  
  // Format date for datetime-local input
  let takenAtStr = ''
  const takenAt = photo.value.exif?.DateTimeOriginal || photo.value.createdAt
  if (takenAt) {
    const date = new Date(takenAt)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    takenAtStr = `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Format shutter speed
  let shutterStr = ''
  if (photo.value.exif?.ExposureTime) {
    const val = photo.value.exif.ExposureTime
    if (typeof val === 'number') {
      shutterStr = val >= 1 ? val.toString() : `1/${Math.round(1/val)}`
    } else {
      shutterStr = val.toString()
    }
  }

  editForm.value = {
    title: photo.value.title || '',
    story: photo.value.story || '',
    camera: photo.value.camera || '',
    lens: photo.value.lens || '',
    location: photo.value.location || '',
    iso: photo.value.exif?.ISO?.toString() || '',
    aperture: photo.value.exif?.FNumber ? `f/${photo.value.exif.FNumber}` : '',
    shutter: shutterStr,
    focalLength: photo.value.exif?.FocalLength?.toString() || '',
    takenAt: takenAtStr
  }
  isEditing.value = true
}

const analyzeWithAi = async () => {
  if (!photo.value) return
  
  analyzing.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.post(`/api/ai/photos/${photo.value.id}/analyze`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const data = response.data
    // Auto-fill edit form
    if (data.story) editForm.value.story = data.story
    if (data.camera) editForm.value.camera = data.camera
    if (data.lens) editForm.value.lens = data.lens
    if (data.location) editForm.value.location = data.location
    if (data.iso) editForm.value.iso = data.iso
    if (data.aperture) editForm.value.aperture = data.aperture
    if (data.shutter) editForm.value.shutter = data.shutter
    // Note: AI might not return focalLength, but we keep existing if not returned
    // if (data.focalLength) editForm.value.focalLength = data.focalLength

    toast.success('AI 识别完成')
  } catch (error) {
    console.error('AI analysis failed', error)
    toast.error('AI 识别失败')
  } finally {
    analyzing.value = false
  }
}

const cancelEdit = () => {
  isEditing.value = false
}

const saveEdit = async () => {
  if (!photo.value) return
  saving.value = true
  try {
    const token = localStorage.getItem('token')
    
    // Parse takenAt back to ISO string
    let takenAtISO = undefined
    if (editForm.value.takenAt) {
      takenAtISO = new Date(editForm.value.takenAt).toISOString()
    }

    const payload = {
      title: editForm.value.title,
      story: editForm.value.story,
      // description removed
      camera: editForm.value.camera,
      lens: editForm.value.lens,
      location: editForm.value.location,
      takenAt: takenAtISO,
      // Metadata fields for EXIF update
      iso: editForm.value.iso,
      aperture: editForm.value.aperture,
      shutter: editForm.value.shutter,
      focalLength: editForm.value.focalLength
    }

    await axios.patch(`/api/photos/${photo.value.id}`, payload, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    toast.success('更新成功')
    isEditing.value = false
    await fetchPhoto() // Refresh data
  } catch (error) {
    console.error('Update failed', error)
    toast.error('更新失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  await Promise.all([fetchPhoto(), fetchComments(), fetchLikeCount()])
  loading.value = false
})
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
  </div>

  <div v-else-if="photo" class="max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <button @click="router.back()" class="flex items-center gap-2 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft class="w-4 h-4" />
        <span>返回画廊</span>
      </button>

      <div v-if="auth.user?.role === 'ADMIN'" class="flex gap-2">
        <button 
          v-if="!isEditing"
          @click="startEdit"
          class="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg transition-all text-sm font-medium"
        >
          <Edit class="w-4 h-4" />
          <span>编辑照片</span>
        </button>
        <button 
          v-if="!isEditing"
          @click="handleDeletePhoto"
          class="flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-200 rounded-lg transition-all text-sm font-medium"
        >
          <Trash2 class="w-4 h-4" />
          <span>删除照片</span>
        </button>
        <div v-else class="flex gap-2">
          <button 
            @click="cancelEdit"
            class="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg transition-all text-sm font-medium"
          >
            <X class="w-4 h-4" />
            <span>取消</span>
          </button>
          <button 
            @click="saveEdit"
            :disabled="saving"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50"
          >
            <Save class="w-4 h-4" />
            <span>{{ saving ? '保存中...' : '保存修改' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Main Image -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
          <img :src="photo.url" :alt="photo.title" class="w-full h-auto" />
        </div>
        
        <div class="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-neutral-800">
          <div v-if="!isEditing">
            <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{{ photo.title }}</h1>
            <div v-if="photo.story" class="prose prose-neutral dark:prose-invert max-w-none text-gray-700 dark:text-neutral-300" v-html="photo.story"></div>
            <!-- description removed -->
          </div>
          <div v-else class="space-y-6">
            <div class="flex justify-end">
              <button 
                type="button"
                @click="analyzeWithAi"
                :disabled="analyzing"
                class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Sparkles class="w-4 h-4" :class="{ 'animate-spin': analyzing }" />
                <span class="text-sm font-medium">{{ analyzing ? 'AI 识别中...' : 'AI 智能识别' }}</span>
              </button>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-bold text-gray-500 dark:text-neutral-400">标题</label>
              <input 
                v-model="editForm.title"
                class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-bold text-gray-500 dark:text-neutral-400">故事 / Story</label>
              <textarea 
                v-model="editForm.story"
                rows="4"
                class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                placeholder="支持 HTML 标签"
              ></textarea>
            </div>
            <!-- description input removed -->
          </div>
        </div>

        <!-- Comments Section -->
        <div class="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-neutral-800">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
            <MessageCircle class="w-5 h-5" />
            评论 ({{ comments.length }})
          </h3>

          <div v-if="showCommentForm" class="mb-8 bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-xl">
            <textarea 
              v-model="commentContent"
              rows="3"
              class="w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all mb-3 text-gray-900 dark:text-white"
              placeholder="写下你的想法..."
            ></textarea>
            <div class="flex justify-end gap-2">
              <button 
                @click="showCommentForm = false"
                class="px-4 py-2 text-sm text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                取消
              </button>
              <button 
                @click="handleComment"
                :disabled="submittingComment || !commentContent.trim()"
                class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-neutral-700 px-6 py-2 rounded-lg text-sm font-bold transition-all text-white"
              >
                {{ submittingComment ? '发布中...' : '发布评论' }}
              </button>
            </div>
          </div>

          <div class="space-y-6">
            <div v-for="comment in comments" :key="comment.id" class="flex gap-4 group">
              <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <UserIcon class="w-5 h-5 text-gray-400 dark:text-neutral-500" />
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-indigo-600 dark:text-indigo-400">
                    {{ comment.user?.username || comment.nickname || '匿名用户' }}
                  </span>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-400 dark:text-neutral-500">
                      {{ dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm') }}
                    </span>
                    <button 
                      v-if="auth.user?.role === 'ADMIN' || (auth.user && comment.user?.username === auth.user.username)"
                      @click="handleDeleteComment(comment.id)"
                      class="text-gray-400 dark:text-neutral-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p class="text-gray-600 dark:text-neutral-300 text-sm leading-relaxed">{{ comment.content }}</p>
              </div>
            </div>
            
            <div v-if="comments.length === 0" class="text-center py-8 text-gray-500 dark:text-neutral-500">
              暂无评论，来坐沙发吧~
            </div>
          </div>
        </div>
      </div>

      <!-- Info Sidebar -->
      <div class="space-y-6">
        <div class="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-neutral-800">
          <h3 class="flex items-center gap-2 font-bold mb-6 text-indigo-600 dark:text-indigo-400">
            <Info class="w-5 h-5" />
            <span>拍摄信息</span>
          </h3>

          <div v-if="!isEditing" class="space-y-4">
            <div class="flex items-start gap-3">
              <Camera class="w-5 h-5 text-gray-400 dark:text-neutral-500 shrink-0" />
              <div>
                <p class="text-xs text-gray-400 dark:text-neutral-500 uppercase font-bold tracking-wider">器材</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ photo.camera || '未知' }}</p>
                <p class="text-xs text-gray-500 dark:text-neutral-400">{{ photo.lens || '未知镜头' }}</p>
              </div>
            </div>

            <div v-if="photo.exif" class="grid grid-cols-2 gap-4 pt-2">
              <div class="bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-3 border border-gray-200 dark:border-neutral-700">
                <p class="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">光圈</p>
                <p class="font-mono text-sm text-gray-900 dark:text-white">f/{{ formatAperture(photo.exif.FNumber) }}</p>
              </div>
              <div class="bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-3 border border-gray-200 dark:border-neutral-700">
                <p class="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">快门</p>
                <p class="font-mono text-sm text-gray-900 dark:text-white">{{ formatExposureTime(photo.exif.ExposureTime) }}s</p>
              </div>
              <div class="bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-3 border border-gray-200 dark:border-neutral-700">
                <p class="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">ISO</p>
                <p class="font-mono text-sm text-gray-900 dark:text-white">{{ photo.exif.ISO || '-' }}</p>
              </div>
              <div class="bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-3 border border-gray-200 dark:border-neutral-700">
                <p class="text-[10px] text-gray-400 dark:text-neutral-500 uppercase">焦距</p>
                <p class="font-mono text-sm text-gray-900 dark:text-white">{{ photo.exif.FocalLength || '-' }}mm</p>
              </div>
            </div>

            <div class="flex items-start gap-3 pt-2">
              <Calendar class="w-5 h-5 text-gray-400 dark:text-neutral-500 shrink-0" />
              <div>
                <p class="text-xs text-gray-400 dark:text-neutral-500 uppercase font-bold tracking-wider">拍摄时间</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ dayjs(photo.exif?.DateTimeOriginal || photo.createdAt).format('YYYY年MM月DD日 HH:mm') }}</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <MapPin class="w-5 h-5 text-gray-400 dark:text-neutral-500 shrink-0" />
              <div>
                <p class="text-xs text-gray-400 dark:text-neutral-500 uppercase font-bold tracking-wider">拍摄地点</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ photo.location || '地球上的某个角落' }}</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
               <UserIcon class="w-5 h-5 text-gray-400 dark:text-neutral-500 shrink-0" />
               <div>
                 <p class="text-xs text-gray-400 dark:text-neutral-500 uppercase font-bold tracking-wider">摄影师</p>
                 <p class="text-sm font-medium text-gray-900 dark:text-white">{{ photo.user?.username || '匿名' }}</p>
               </div>
            </div>

            <div class="pt-4 mt-4 border-t border-gray-200 dark:border-neutral-800">
              <a 
                :href="photo.url.replace('/compressed/', '/')" 
                target="_blank"
                :download="photo.title + '.jpg'"
                class="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all text-sm font-medium group"
              >
                <Download class="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>下载原图</span>
              </a>
            </div>
          </div>
          
          <div v-else class="space-y-4">
             <div class="space-y-2">
               <label class="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-neutral-400 uppercase tracking-wider">
                 <Camera class="w-4 h-4" /> 相机 & 镜头
               </label>
               <input 
                 v-model="editForm.camera"
                 placeholder="相机型号"
                 class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
               />
               <input 
                 v-model="editForm.lens"
                 placeholder="镜头型号"
                 class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
               />
             </div>

             <div class="space-y-2">
               <label class="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-neutral-400 uppercase tracking-wider">
                 <Settings class="w-4 h-4" /> 拍摄参数
               </label>
               <div class="grid grid-cols-2 gap-2">
                 <input 
                   v-model="editForm.aperture"
                   placeholder="光圈 (f/1.8)"
                   class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                 />
                 <input 
                   v-model="editForm.shutter"
                   placeholder="快门 (1/100)"
                   class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                 />
                 <input 
                   v-model="editForm.iso"
                   placeholder="ISO"
                   class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                 />
                 <div>
                   <label class="block text-xs font-bold text-gray-500 dark:text-neutral-500 uppercase">焦距</label>
                   <input 
                     v-model="editForm.focalLength"
                     placeholder="23"
                     class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-mono text-gray-900 dark:text-white"
                   />
                 </div>
               </div>
             </div>

             <div class="space-y-2">
               <label class="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-neutral-400 uppercase tracking-wider">
                 <Calendar class="w-4 h-4" /> 拍摄时间
               </label>
               <input 
                 v-model="editForm.takenAt"
                 type="datetime-local"
                 class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
               />
             </div>

             <div class="space-y-2">
               <label class="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-neutral-400 uppercase tracking-wider">
                 <MapPin class="w-4 h-4" /> 地点
               </label>
               <input 
                 v-model="editForm.location"
                 class="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
               />
             </div>
          </div>

          <div class="flex items-center justify-between mt-8 pt-6 border-t border-neutral-800">
            <button 
              @click="handleLike"
              class="flex items-center gap-2 text-neutral-400 hover:text-rose-500 transition-colors group"
            >
              <Heart class="w-5 h-5 group-hover:scale-110 transition-transform" :class="{ 'fill-rose-500 text-rose-500': false }" />
              <span>{{ likeCount || '赞' }}</span>
            </button>
            <button 
              @click="showCommentForm = !showCommentForm"
              class="flex items-center gap-2 text-neutral-400 hover:text-indigo-400 transition-colors"
            >
              <MessageCircle class="w-5 h-5" />
              <span>评论</span>
            </button>
            <!-- Share button removed -->
          </div>
        </div>
      </div>
    </div>
  </div>

  <ConfirmModal 
    :show="showDeleteModal"
    :title="deleteType === 'photo' ? '删除照片' : '删除评论'"
    :message="deleteType === 'photo' ? '确定要删除这张照片吗？此操作不可恢复。' : '确定要删除这条评论吗？'"
    :loading="deleteLoading"
    @close="showDeleteModal = false"
    @confirm="confirmDelete"
  />
</template>
