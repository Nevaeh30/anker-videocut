<template>
  <div class="video-editor max-w-7xl mx-auto p-4">
    <div class="header flex justify-between items-center mb-4">
      <div class="flex items-center gap-4">
        <!-- 本地上传 -->
        <input 
          type="file" 
          accept="video/*"
          @change="handleFileUpload"
          class="hidden" 
          ref="fileInput"
        >
        <button 
          class="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          @click="$refs.fileInput.click()"
        >
          本地上传
        </button>
        
        <span v-if="currentFile" class="text-gray-600">
          当前视频: {{ currentFile }}
        </span>
      </div>
    </div>

    <!-- 视频播放区域 -->
    <div 
      class="video-container bg-gray-100 rounded-lg overflow-hidden mb-4 relative"
      @click="!videoUrl && $refs.fileInput.click()"
    >
      <div v-if="videoUrl" class="flex justify-center">
        <video 
          ref="videoRef"
          :src="videoUrl"
          class="max-h-[70vh] w-auto"
          controls
        ></video>
      </div>
      <div 
        v-else 
        class="flex items-center justify-center h-64 text-gray-500 cursor-pointer"
      >
        点击上传视频
      </div>
    </div>

    <!-- 时间点输入和控制区域 -->
    <div v-if="videoUrl" class="mb-4 space-y-4">
      <div class="flex gap-4 items-center">
        <input 
          v-model="timePoints"
          placeholder="输入时间点，用逗号分隔 (如: 1.5, 2.8)"
          class="border rounded px-3 py-2 flex-grow"
        >
        <button 
          @click="captureFrames"
          :disabled="isCapturing"
          class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {{ isCapturing ? '提取中...' : '批量截取' }}
        </button>
        <button 
          @click="captureCurrentFrame"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          截取当前帧
        </button>
      </div>
    </div>

    <!-- 提取帧预览区域 -->
    <div v-if="capturedFrames.length" class="mt-6 mb-20">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-medium text-gray-800">已提取帧 ({{ capturedFrames.length }})</h3>
        <button 
          @click="toggleSortOrder"
          class="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <span>{{ sortAscending ? '时间升序' : '时间降序' }}</span>
          <span class="transform transition-transform" :class="{ 'rotate-180': !sortAscending }">
            {{ sortAscending ? '↑' : '↓' }}
          </span>
        </button>
      </div>
      
      <div class="grid grid-cols-4 gap-6">
        <div 
          v-for="frame in sortedFrames" 
          :key="frame.id" 
          class="relative group"
        >
          <div class="relative overflow-hidden rounded-xl shadow-sm group-hover:shadow-md transition-all duration-300">
            <img 
              :src="frame.url" 
              class="w-full aspect-video object-cover"
              :class="{
                'ring-2 ring-blue-500 ring-offset-2': selectedFrames.includes(frame)
              }"
            >
            <!-- 添加选中状态指示器 -->
            <div 
              v-if="selectedFrames.includes(frame)"
              class="absolute top-2 right-2 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center"
            >
              <span class="text-sm">✓</span>
            </div>
            <!-- 修改遮罩层，添加点击事件 -->
            <div 
              class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
              @click="handleFrameClick(frame, $event)"
            >
              <!-- 预览按钮 -->
              <button 
                @click.stop="openPreview(frame)"
                class="absolute top-2 left-2 bg-white/90 p-2 rounded-full hover:bg-white transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
              <span class="text-sm text-white font-medium">{{ formatTime(frame.time) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 固定在右下角的操作按钮 -->
    <div 
      v-if="selectedFrames.length" 
      class="fixed bottom-6 right-6 flex flex-col gap-3 z-40"
    >
      <!-- 下载按钮组 -->
      <div class="relative">
        <button 
          @click="toggleDownloadMenu"
          class="group bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
        >
          <span>下载所选 ({{ selectedFrames.length }})</span>
          <span 
            class="transform transition-transform duration-300" 
            :class="{ 'rotate-180': showDownloadMenu }"
          >▼</span>
        </button>
        
        <!-- 下拉菜单 -->
        <div 
          v-show="showDownloadMenu"
          class="absolute bottom-full mb-2 right-0 bg-white rounded-xl shadow-xl py-1 min-w-full overflow-hidden backdrop-blur-sm bg-white/90"
        >
          <button 
            @click="downloadSelectedFrames"
            class="w-full px-4 py-3 text-left hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2"
          >
            <span>直接下载</span>
          </button>
          <button 
            @click="openRenameModal"
            class="w-full px-4 py-3 text-left hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2"
          >
            <span>重命名并下载</span>
          </button>
        </div>
      </div>

      <!-- 删除按钮 -->
      <button 
        @click="deleteSelectedFrames"
        class="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-300"
      >
        删除所选 ({{ selectedFrames.length }})
      </button>
    </div>

    <!-- 预览模态框 -->
    <div 
      v-if="previewFrame" 
      class="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      @click="closePreview"
      @keydown="handleKeyPress"
      tabindex="0"
      ref="previewModal"
    >
      <div class="relative max-w-4xl max-h-[90vh] p-4">
        <img 
          :src="previewFrame.url" 
          class="max-w-full max-h-[80vh] object-contain"
          @click.stop
        >
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm">
          {{ formatTime(previewFrame.time) }}
          <span class="text-gray-400 ml-2">
            ({{ currentPreviewIndex + 1 }}/{{ sortedFrames.length }})
          </span>
        </div>
        
        <!-- 导航按钮 -->
        <button 
          v-if="currentPreviewIndex > 0"
          class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full backdrop-blur-sm transition-colors"
          @click.stop="showPreviousFrame"
        >
          ←
        </button>
        <button 
          v-if="currentPreviewIndex < sortedFrames.length - 1"
          class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full backdrop-blur-sm transition-colors"
          @click.stop="showNextFrame"
        >
          →
        </button>

        <!-- 关闭按钮 -->
        <button 
          class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          @click.stop="closePreview"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 重命名模态框 -->
    <div 
      v-if="showRenameModal" 
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      @click="closeRenameModal"
    >
      <div 
        class="bg-white rounded-2xl p-6 w-96 space-y-4 shadow-2xl"
        @click.stop
      >
        <h3 class="text-xl font-medium text-gray-800">批量重命名</h3>
        
        <div class="space-y-2">
          <label class="block text-sm text-gray-600">
            文件名前缀（可选）
          </label>
          <input 
            v-model="filePrefix"
            class="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="例如：frame"
          >
        </div>
        
        <div class="flex justify-end gap-3 pt-2">
          <button 
            class="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            @click="closeRenameModal"
          >
            取消
          </button>
          <button 
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            @click="downloadWithRename"
          >
            确认下载
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import axios from 'axios'

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
const youtubeUrl = ref('')
const isLoading = ref(false)
const videoDuration = ref(0)
const isCapturing = ref(false)
const sortAscending = ref(true)
const currentPreviewIndex = ref(0)
const previewModal = ref(null)
const showRenameModal = ref(false)
const showDownloadMenu = ref(false)
const filePrefix = ref('')

// 验证YouTube链接
const isValidYoutubeUrl = computed(() => {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
  return regex.test(youtubeUrl.value)
})

// 处理YouTube链接粘贴
const handleYoutubePaste = (event) => {
  const pastedText = event.clipboardData.getData('text')
  if (pastedText.includes('youtube.com') || pastedText.includes('youtu.be')) {
    youtubeUrl.value = pastedText.trim()
  }
}

// 获取YouTube视频
const fetchYoutubeVideo = async () => {
  if (!isValidYoutubeUrl.value) return
  
  isLoading.value = true
  try {
    const videoId = extractYoutubeVideoId(youtubeUrl.value)
    if (!videoId) {
      throw new Error('无效的YouTube链接')
    }
    
    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`
    
    // 使用代理路径
    const response = await axios.post('/api/single_post', {
      userId: 'ACE491D263B25430E9C7B5C453B75D8C',
      secretKey: '095835755e03c1a9c695372672e18484',
      url: cleanUrl
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('API响应:', response.data)  // 添加调试日志
    
    if (response.data.code === 200 && response.data.data) {
      const mediaData = response.data.data.medias[0]
      if (mediaData && mediaData.media_type === 'video') {
        // 使用代理下载视频
        const videoResponse = await fetch(mediaData.resource_url, {
          headers: mediaData.headers || {}
        })
        
        if (!videoResponse.ok) {
          throw new Error('视频下载失败')
        }
        
        const videoBlob = await videoResponse.blob()
        
        if (videoUrl.value) {
          URL.revokeObjectURL(videoUrl.value)
        }
        
        resetState()
        videoUrl.value = URL.createObjectURL(videoBlob)
        currentFile.value = '已下载的YouTube视频'
        youtubeUrl.value = ''
        
        console.log('视频加载成功，URL:', videoUrl.value)  // 添加调试日志
      } else {
        throw new Error('未找到视频资源')
      }
    } else {
      throw new Error(response.data.msg || '获取视频失败')
    }
    
  } catch (error) {
    console.error('错误详情:', error)
    if (error.response) {
      console.error('API错误响应:', error.response.data)
    }
    alert('获取视频失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

// 提取YouTube视频ID的辅助函数
const extractYoutubeVideoId = (url) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[7].length === 11) ? match[7] : null
}

// 重置状态函数
const resetState = () => {
  capturedFrames.value = []
  selectedFrames.value = []
  previewFrame.value = null
  timePoints.value = ''
}

// 处理本地视频上传
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // 检查是否是视频文件
  if (!file.type.startsWith('video/')) {
    alert('请上传视频文件')
    return
  }
  
  // 清理旧的视频URL
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
  }
  
  // 重置状态
  resetState()
  
  // 创建新的视频URL
  videoUrl.value = URL.createObjectURL(file)
  currentFile.value = file.name
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
  
  const times = timePoints.value.split(',')
    .map(t => parseFloat(t.trim()))
    .filter(t => !isNaN(t))
  
  if (times.length === 0) {
    alert('请输入有效的时间点')
    return
  }
  
  isCapturing.value = true
  try {
    for (const time of times) {
      videoRef.value.currentTime = time
      await new Promise(resolve => {
        videoRef.value.onseeked = resolve
      })
      await captureCurrentFrame()
    }
    timePoints.value = ''
  } finally {
    isCapturing.value = false
  }
}

// 提取当前帧
const captureCurrentFrame = async () => {
  if (!videoRef.value) return
  
  const video = videoRef.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', 0.95)
  })
  
  capturedFrames.value.push({
    id: Date.now(),
    time: video.currentTime,
    url: URL.createObjectURL(blob),
    blob: blob
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
  console.log('视频加载完成，时长:', videoRef.value.duration)
  videoDuration.value = videoRef.value.duration
}

const handleTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
  }
}

const formatTime = (time) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  const frames = Math.floor((time % 1) * 24) // 假设24fps
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`
}

// 修改点击处理函数
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
    const lastIndex = sortedFrames.value.indexOf(lastSelected)
    const currentIndex = sortedFrames.value.indexOf(frame)
    const start = Math.min(lastIndex, currentIndex)
    const end = Math.max(lastIndex, currentIndex)
    
    const newSelection = sortedFrames.value.slice(start, end + 1)
    selectedFrames.value = Array.from(new Set([...selectedFrames.value, ...newSelection]))
  } else {
    // 普通点击选中并预览
    selectedFrames.value = [frame]
    openPreview(frame)
  }
}

// 批量下载选中的帧
const downloadSelectedFrames = () => {
  selectedFrames.value.forEach((frame, index) => {
    setTimeout(() => {
      const link = document.createElement('a')
      link.href = frame.url
      
      // 使用前缀+序号命名
      const prefix = filePrefix.value.trim()
      const number = (index + 1).toString().padStart(2, '0')
      const fileName = prefix ? `${prefix}_${number}.jpg` : `${number}.jpg`
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }, index * 100)
  })
}

// 删除选中的帧
const deleteSelectedFrames = () => {
  capturedFrames.value = capturedFrames.value.filter(
    frame => !selectedFrames.value.includes(frame)
  )
  selectedFrames.value = []
  previewFrame.value = null
}

// 排序后的帧列表
const sortedFrames = computed(() => {
  return [...capturedFrames.value].sort((a, b) => {
    return sortAscending.value ? a.time - b.time : b.time - a.time
  })
})

// 切换排序顺序
const toggleSortOrder = () => {
  sortAscending.value = !sortAscending.value
}

// 打开预览
const openPreview = (frame) => {
  previewFrame.value = frame
  currentPreviewIndex.value = sortedFrames.value.findIndex(f => f.id === frame.id)
  nextTick(() => {
    previewModal.value?.focus()
  })
}

// 关闭预览
const closePreview = () => {
  previewFrame.value = null
}

// 显示上一帧
const showPreviousFrame = () => {
  if (currentPreviewIndex.value > 0) {
    currentPreviewIndex.value--
    previewFrame.value = sortedFrames.value[currentPreviewIndex.value]
  }
}

// 显示下一帧
const showNextFrame = () => {
  if (currentPreviewIndex.value < sortedFrames.value.length - 1) {
    currentPreviewIndex.value++
    previewFrame.value = sortedFrames.value[currentPreviewIndex.value]
  }
}

// 优化键盘事件处理
const handleKeyPress = (event) => {
  if (previewFrame.value) {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        showPreviousFrame()
        event.preventDefault()
        break
      case 'ArrowRight':
      case 'ArrowDown':
        showNextFrame()
        event.preventDefault()
        break
      case 'Escape':
        closePreview()
        event.preventDefault()
        break
    }
  }
}

// 切换下载菜单
const toggleDownloadMenu = () => {
  showDownloadMenu.value = !showDownloadMenu.value
}

// 打开重命名模态框
const openRenameModal = () => {
  showDownloadMenu.value = false
  showRenameModal.value = true
}

// 关闭重命名模态框
const closeRenameModal = () => {
  showRenameModal.value = false
  filePrefix.value = ''
}

// 带重命名的下载
const downloadWithRename = () => {
  selectedFrames.value.forEach((frame, index) => {
    setTimeout(() => {
      const link = document.createElement('a')
      link.href = frame.url
      
      // 使用前缀+序号命名
      const prefix = filePrefix.value.trim()
      const number = (index + 1).toString().padStart(2, '0')
      const fileName = prefix ? `${prefix}_${number}.jpg` : `${number}.jpg`
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }, index * 100)
  })
  
  closeRenameModal()
}

// 修改点击事件监听，只在点击下拉菜单外部时关闭
onMounted(() => {
  document.addEventListener('click', (event) => {
    const target = event.target
    const isDownloadButton = target.closest('.relative')
    if (!isDownloadButton) {
      showDownloadMenu.value = false
    }
  })
})

onUnmounted(() => {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
  }
  capturedFrames.value.forEach(frame => {
    URL.revokeObjectURL(frame.url)
  })
})
</script>

<style scoped>
.video-editor {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.aspect-video {
  aspect-ratio: 16 / 9;
}

.transition-shadow {
  transition: box-shadow 0.2s ease;
}

/* 添加过渡动画 */
.transform {
  transition: transform 0.2s ease;
}

/* 确保固定按钮在滚动时保持可见 */
.fixed {
  z-index: 40;
}

/* 平滑过渡 */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* 渐变背景 */
.bg-gradient-to-r {
  background-size: 200% 200%;
  animation: gradient 3s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* 玻璃态效果 */
.backdrop-blur-sm {
  backdrop-filter: blur(8px);
}

/* 添加选中状态动画 */
.ring-2 {
  transition: all 0.2s ease;
}

/* 优化预览模态框过渡 */
.fixed {
  transition: opacity 0.3s ease;
}

/* 确保预览模态框可以接收键盘事件 */
[tabindex="0"] {
  outline: none;
}
</style> 