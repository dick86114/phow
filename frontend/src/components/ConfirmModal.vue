<script setup lang="ts">
import { AlertTriangle, X } from 'lucide-vue-next'

defineProps<{
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
}>()

const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"></div>

        <!-- Modal -->
        <div 
          class="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-neutral-800 transform transition-all"
        >
          <div class="p-6">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <AlertTriangle class="w-6 h-6 text-rose-600 dark:text-rose-500" />
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {{ title }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-neutral-400 leading-relaxed">
                  {{ message }}
                </p>
              </div>
              <button 
                @click="emit('close')"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-neutral-800/50 px-6 py-4 flex justify-end gap-3">
            <button
              @click="emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              {{ cancelText || '取消' }}
            </button>
            <button
              @click="emit('confirm')"
              :disabled="loading"
              class="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{{ confirmText || '确认删除' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
