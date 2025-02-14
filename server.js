const express = require('express')
const cors = require('cors')
const axios = require('axios')
const app = express()

app.use(cors())
app.use(express.json())

app.post('/api/youtube', async (req, res) => {
  try {
    const response = await axios.post('https://h.aaaapp.cn/single_post', {
      userId: 'ACE491D263B25430E9C7B5C453B75D8C',
      secretKey: '095835755e03c1a9c695372672e18484',
      url: req.body.url
    })
    res.json(response.data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
}) 