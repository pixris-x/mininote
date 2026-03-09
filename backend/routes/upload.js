const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const authMiddleware = require('../middleware/auth')

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads/images')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase())
    const mimeOk = allowed.test(file.mimetype)
    if (extOk && mimeOk) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件（jpg/png/gif/webp/svg）'))
    }
  }
})

// POST /api/upload/image
router.post('/image', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '没有收到文件' })
  }
  const url = `/uploads/images/${req.file.filename}`
  res.json({ success: true, url })
})

// 错误处理（multer 限制）
router.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: '图片大小不能超过 5MB' })
  }
  res.status(400).json({ success: false, message: err.message || '上传失败' })
})

module.exports = router
