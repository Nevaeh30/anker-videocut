<template>
  <div class="container mx-auto p-4">
    <!-- 视频上传和预览区域 -->
    <div class="bg-white rounded-lg shadow-lg p-4 mb-4">
      <div class="flex items-center justify-between mb-4">
        <span class="text-gray-600">当前文件：{{ currentFile }}</span>
        <button @click="$refs.fileInput.click()" class="bg-primary text-white px-4 py-2 rounded-button flex items-center">
          <i class="fas fa-plus mr-2"></i>
          上传视频
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="video/*"
          class="hidden"
          @change="handleFileUpload"
        >
      </div>
      
      <video
        ref="video"
        class="w-full aspect-video bg-gray-100 rounded-lg"
        controls
      ></video>
    </div>

    <!-- 控制面板 -->
    <div class="bg-white rounded-lg shadow-lg p-4 mb-4">
      <!-- 播放控制 -->
      <div class="flex items-center justify-center space-x-4 mb-4">
        <button @click="seek(-10)" class="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-button">
          <i class="fas fa-backward"></i>
        </button>
        <button @click="togglePlay" class="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-button">
          <i :class="['fas', isPlaying ? 'fa-pause' : 'fa-play']"></i>
        </button>
        <button @click="seek(10)" class="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-button">
          <i class="fas fa-forward"></i>
        </button>
      </div>

      <!-- 时间轴 -->
      <div class="relative mb-4">
        <input
          type="range"
          class="w-full"
          :min="0"
          :max="video?.duration || 100"
          v-model="timelineValue"
        >
        <div class="flex justify-between text-gray-600 text-sm mt-1">
          <span>{{ currentTime }}</span>
          <span>{{ currentTime }} / {{ duration }}</span>
        </div>
      </div>

      <!-- 时间轴缩放 -->
      <div class="flex justify-end space-x-2 mb-4">
        <button class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-button">
          <i class="fas fa-search-minus"></i>
        </button>
        <button class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-button">
          <i class="fas fa-search-plus"></i>
        </button>
      </div>
    </div>

    <!-- 截取控制 -->
    <div class="bg-white rounded-lg shadow-lg p-4 mb-4">
      <div class="flex items-center justify-between mb-4">
        <button @click="captureFrame" class="bg-primary text-white px-4 py-2 rounded-button">
          截取当前帧
        </button>
        <span class="text-gray-600">已截取：{{ capturedFrames.length }} 帧</span>
      </div>

      <select v-model="selectedFPS" class="border rounded-lg px-2 py-1">
        <option value="24">24 fps</option>
        <option value="30">30 fps</option>
        <option value="60">60 fps</option>
      </select>

      <!-- 预览网格 -->
      <div class="grid grid-cols-6 gap-4">
        <div v-for="(frame, index) in capturedFrames" :key="index" class="relative group">
          <img :src="frame.url" class="w-full aspect-video object-cover rounded-lg">
          <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1">
            {{ formatTime(frame.time) }}
          </div>
          <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
            <button @click="deleteFrame(index)" class="w-8 h-8 flex items-center justify-center bg-white rounded-button">
              <i class="fas fa-trash text-red-500"></i>
            </button>
            <button @click="downloadFrame(frame)" class="w-8 h-8 flex items-center justify-center bg-white rounded-button">
              <i class="fas fa-download text-primary"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 状态定义
const video = ref<HTMLVideoElement | null>(null)
const currentFile = ref<string>('未选择')
const isPlaying = ref(false)
const currentTime = ref('00:00')
const duration = ref('00:00')
const timelineValue = ref(0)
const capturedFrames = ref<Array<{ time: number, url: string }>>([])
const selectedFPS = ref(24)

// 文件上传处理
const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    currentFile.value = file.name
    const videoUrl = URL.createObjectURL(file)
    if (video.value) {
      video.value.src = videoUrl
      video.value.load()
    }
  }
}

// 播放控制
const togglePlay = () => {
  if (!video.value) return
  
  if (video.value.paused) {
    video.value.play()
    isPlaying.value = true
  } else {
    video.value.pause()
    isPlaying.value = false
  }
}

// 快进快退
const seek = (seconds: number) => {
  if (!video.value) return
  video.value.currentTime = Math.max(0, Math.min(video.value.currentTime + seconds, video.value.duration))
}

// 格式化时间
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// 截取当前帧
const captureFrame = async () => {
  if (!video.value) return

  const canvas = document.createElement('canvas')
  canvas.width = video.value.videoWidth
  canvas.height = video.value.videoHeight
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.drawImage(video.value, 0, 0, canvas.width, canvas.height)
  
  try {
    const frameData = {
      time: video.value.currentTime,
      url: canvas.toDataURL('image/jpeg', 0.8)
    }
    capturedFrames.value.push(frameData)
  } catch (error) {
    console.error('帧截取失败:', error)
    alert('帧截取失败，请重试')
  }
}

// 批量截取
const batchCapture = async () => {
  if (!video.value) return
  
  const timeInput = document.querySelector('input[placeholder="时间点"]') as HTMLInputElement
  const times = timeInput.value.split(',').map(t => parseFloat(t.trim())).filter(t => !isNaN(t))
  
  if (times.length === 0) {
    alert('请输入有效的时间点！')
    return
  }

  const originalTime = video.value.currentTime
  video.value.pause()

  for (const time of times) {
    if (time < 0 || time > video.value.duration) continue
    video.value.currentTime = time
    await new Promise(resolve => setTimeout(resolve, 100)) // 等待视频加载到指定时间点
    await captureFrame()
  }

  video.value.currentTime = originalTime
}

// 删除帧
const deleteFrame = (index: number) => {
  capturedFrames.value.splice(index, 1)
}

// 下载帧
const downloadFrame = (frameData: { time: number, url: string }) => {
  const link = document.createElement('a')
  link.download = `frame_${formatTime(frameData.time).replace(/:/g, '-')}.jpg`
  link.href = frameData.url
  link.click()
}

// 视频事件处理
onMounted(() => {
  if (!video.value) return

  video.value.addEventListener('loadedmetadata', () => {
    if (!video.value) return
    duration.value = formatTime(video.value.duration)
  })

  video.value.addEventListener('timeupdate', () => {
    if (!video.value) return
    currentTime.value = formatTime(video.value.currentTime)
    timelineValue.value = video.value.currentTime
  })

  video.value.addEventListener('ended', () => {
    isPlaying.value = false
  })
})
</script>

<style scoped>
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: #E5E7EB;
  border-radius: 2px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #1157F0;
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #1157F0;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

input[type="range"]::-ms-thumb {
  width: 16px;
  height: 16px;
  background: #1157F0;
  border-radius: 50%;
  cursor: pointer;
}
</style>
