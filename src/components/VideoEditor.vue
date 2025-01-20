<template>
  <div class="video-editor">
    <div class="header flex justify-between items-center mb-4">
      <div class="flex items-center gap-4">
        <span v-if="currentFile">当前文件: {{ currentFile }}</span>
      </div>
      <div class="flex gap-2">
        <button class="p-2 rounded hover:bg-gray-100">?</button>
        <button class="p-2 rounded hover:bg-gray-100">⚙️</button>
      </div>
    </div>

    <!-- 视频上传/播放区域 -->
    <div 
      class="video-container bg-gray-100 rounded-lg overflow-hidden mb-4 relative"
      @click="!videoUrl && $refs.fileInput.click()"
    >
      <video 
        v-if="videoUrl"
        ref="videoRef"
        :src="videoUrl"
        class="w-full"
        @loadedmetadata="handleVideoLoaded"
        @timeupdate="handleTimeUpdate"
        controls
      ></video>
      <div 
        v-else 
        class="flex items-center justify-center h-64 text-gray-500 cursor-pointer"
      >
        点击上传视频
      </div>
    </div>

    <input 
      type="file" 
      accept="video/*" 
      @change="handleFileUpload" 
      class="hidden" 
      ref="fileInput"
    >

    <!-- 时间点输入区域 -->
    <div class="mb-4">
      <div class="relative">
        <input
          v-model="timePoints"
          @focus="timePointsPlaceholder = ''"
          @blur="handleTimePointsBlur"
          class="w-full p-2 border rounded"
          :placeholder="timePointsPlaceholder"
        />
      </div>
      <div class="text-xs text-gray-500 mt-1">
        支持格式：秒.帧（如：69.2）或 分:秒.帧（如：1:09.2）
      </div>
    </div>

    <!-- 编辑工具栏 -->
    <div class="edit-tools flex items-center gap-2 mb-4">
      <select v-model="selectedFps" class="border p-1 rounded">
        <option value="24">24 fps</option>
        <option value="30">30 fps</option>
        <option value="60">60 fps</option>
      </select>
      <button 
        class="bg-blue-500 text-white px-4 py-1 rounded"
        @click="captureFrames"
      >
        批量截取
      </button>
    </div>

    <!-- 缩略图预览区 -->
    <div class="thumbnails grid grid-cols-6 gap-2">
      <div 
        v-for="(frame, index) in capturedFrames" 
        :key="index"
        class="thumbnail-item relative"
        :class="{ 'ring-2 ring-blue-500': selectedFrames.includes(frame) }"
        @click="handleFrameClick(frame, $event)"
      >
        <img 
          :src="frame.dataUrl" 
          class="w-full aspect-video object-cover rounded border cursor-pointer"
        >
        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
          {{ formatTime(frame.timestamp) }}
        </div>
        <button 
          @click.stop="downloadFrame(frame)"
          class="absolute top-1 right-1 bg-blue-500 text-white p-1 rounded-full text-xs opacity-0 hover:opacity-100 transition-opacity"
        >
          💾
        </button>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <div 
      v-if="previewFrame"
      class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      @click="previewFrame = null"
    >
      <div class="relative max-w-4xl max-h-[90vh]">
        <img 
          :src="previewFrame.dataUrl" 
          class="max-w-full max-h-[90vh] object-contain"
        >
        <div class="absolute bottom-4 left-0 right-0 text-white text-center">
          {{ formatTime(previewFrame.timestamp) }}
        </div>
      </div>
    </div>

    <!-- 批量下载按钮 -->
    <div v-if="selectedFrames.length > 0" class="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
      <div class="text-sm mb-2">已选择 {{ selectedFrames.length }} 帧</div>
      <button 
        @click="downloadSelectedFrames"
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        下载选中帧
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const videoRef = ref(null)
const fileInput = ref(null)
const videoUrl = ref('')
const currentTime = ref(0)
const duration = ref(0)
const currentFile = ref('')
const selectedFps = ref('24')
const capturedFrames = ref([])
const timePoints = ref('')
const timePointsPlaceholder = ref('输入时间点，用","分割')
const selectedFrames = ref([])
const previewFrame = ref(null)

// 处理文件上传
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    videoUrl.value = URL.createObjectURL(file)
    currentFile.value = file.name
  }
}

// 处理时间点输入框失焦
const handleTimePointsBlur = () => {
  if (!timePoints.value) {
    timePointsPlaceholder.value = '输入时间点，用","分割'
  }
}

// 解析时间点
const parseTimePoint = (timePoint) => {
  const trimmed = timePoint.trim()
  if (trimmed.includes(':')) {
    // 格式：分:秒.帧
    const [minutes, secondsAndFrames] = trimmed.split(':')
    const [seconds, frames] = secondsAndFrames.split('.')
    return parseInt(minutes) * 60 + parseInt(seconds) + parseInt(frames) / parseInt(selectedFps.value)
  } else {
    // 格式：秒.帧
    const [seconds, frames] = trimmed.split('.')
    return parseInt(seconds) + parseInt(frames) / parseInt(selectedFps.value)
  }
}

// 批量截取帧
const captureFrames = async () => {
  if (!videoRef.value || !timePoints.value) return

  const points = timePoints.value.split(',')
  for (const point of points) {
    const time = parseTimePoint(point)
    videoRef.value.currentTime = time
    
    // 等待视频定位到指定时间
    await new Promise(resolve => {
      const handleSeeked = () => {
        videoRef.value.removeEventListener('seeked', handleSeeked)
        resolve()
      }
      videoRef.value.addEventListener('seeked', handleSeeked)
    })

    captureFrame(time)
  }
}

// 截取单帧
const captureFrame = (timestamp) => {
  if (!videoRef.value) return

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  canvas.width = videoRef.value.videoWidth
  canvas.height = videoRef.value.videoHeight
  
  ctx.drawImage(videoRef.value, 0, 0, canvas.width, canvas.height)
  
  const dataUrl = canvas.toDataURL('image/jpeg')
  
  capturedFrames.value.push({
    dataUrl,
    timestamp,
    width: canvas.width,
    height: canvas.height
  })
}

// 下载帧
const downloadFrame = (frame) => {
  const link = document.createElement('a')
  link.href = frame.dataUrl
  link.download = `frame-${formatTime(frame.timestamp).replace(':', '-')}.jpg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleVideoLoaded = () => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration
  }
}

const handleTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
  }
}

const formatTime = (time) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  const frames = Math.floor((time % 1) * parseInt(selectedFps.value))
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frames}`
}

// 处理帧点击事件
const handleFrameClick = (frame, event) => {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd + 点击进行多选
    const index = selectedFrames.value.indexOf(frame)
    if (index === -1) {
      selectedFrames.value.push(frame)
    } else {
      selectedFrames.value.splice(index, 1)
    }
  } else if (event.shiftKey && selectedFrames.value.length > 0) {
    // Shift + 点击进行范围选择
    const lastSelected = selectedFrames.value[selectedFrames.value.length - 1]
    const lastIndex = capturedFrames.value.indexOf(lastSelected)
    const currentIndex = capturedFrames.value.indexOf(frame)
    const start = Math.min(lastIndex, currentIndex)
    const end = Math.max(lastIndex, currentIndex)
    
    const newSelection = capturedFrames.value.slice(start, end + 1)
    selectedFrames.value = Array.from(new Set([...selectedFrames.value, ...newSelection]))
  } else {
    // 普通点击进行预览
    previewFrame.value = frame
    selectedFrames.value = [frame]
  }
}

// 批量下载选中的帧
const downloadSelectedFrames = () => {
  selectedFrames.value.forEach((frame, index) => {
    setTimeout(() => {
      const link = document.createElement('a')
      link.href = frame.dataUrl
      link.download = `frame-${formatTime(frame.timestamp).replace(':', '-')}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }, index * 100) // 添加延迟避免浏览器阻止多个下载
  })
}

onUnmounted(() => {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
  }
})
</script>

<style scoped>
.video-editor {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.thumbnail-item {
  position: relative;
  transition: all 0.2s;
  cursor: pointer;
}

.thumbnail-item:hover {
  transform: scale(1.05);
  z-index: 1;
}

.thumbnail-item button {
  transition: opacity 0.2s;
}

.thumbnail-item:hover button {
  opacity: 1;
}

/* 选中状态样式 */
.thumbnail-item.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px #3b82f6;
}
</style> 