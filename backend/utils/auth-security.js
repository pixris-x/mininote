const crypto = require('crypto')

function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex')
}

function generateChallengeId() {
  return crypto.randomBytes(24).toString('hex')
}

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || null
}

function detectDeviceName(req) {
  const custom = String(req.body?.device_name || '').trim()
  if (custom) return custom.slice(0, 120)

  const ua = String(req.headers['user-agent'] || '').toLowerCase()
  if (!ua) return 'Unknown Device'
  if (ua.includes('iphone')) return 'iPhone'
  if (ua.includes('ipad')) return 'iPad'
  if (ua.includes('android')) return 'Android Device'
  if (ua.includes('mac os')) return 'Mac'
  if (ua.includes('windows')) return 'Windows PC'
  if (ua.includes('linux')) return 'Linux Device'
  return 'Browser Device'
}

module.exports = {
  generate6DigitCode,
  generateSessionId,
  generateChallengeId,
  extractClientIp,
  detectDeviceName
}


