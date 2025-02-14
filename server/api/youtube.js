const express = require('express')
const ytdl = require('ytdl-core')
const router = express.Router()

router.post('/youtube-download', async (req, res) => {
  try {
    const { url } = req.body
    
    // 验证YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: '无效的YouTube链接' })
    }

    // 获取视频信息
    const info = await ytdl.getInfo(url)
    
    // 选择最佳质量的视频格式
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest' })
    
    // 设置响应头
    res.header('Content-Type', 'video/mp4')
    
    // 流式传输视频
    ytdl(url, { format: format })
      .pipe(res)
      
  } catch (error) {
    console.error('YouTube下载错误:', error)
    res.status(500).json({ error: '下载视频失败' })
  }
})

module.exports = router 