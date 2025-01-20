import { createRouter, createWebHistory } from 'vue-router'
import VideoEditor from '../components/VideoEditor.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'VideoEditor',
      component: VideoEditor
    }
  ]
})

export default router 