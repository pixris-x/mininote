#!/usr/bin/env node

const { execSync } = require('node:child_process')

const port = (process.argv[2] || process.env.NUXT_DEV_PORT || process.env.PORT || '5173').toString()

function killOnWindows(targetPort) {
  let output = ''
  try {
    output = execSync(`netstat -ano | findstr :${targetPort}`, { encoding: 'utf8' })
  } catch (error) {
    output = String(error.stdout || '')
  }

  const pids = new Set()
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (!line.includes(`:${targetPort}`)) continue
    const parts = line.split(/\s+/)
    const pid = parts[parts.length - 1]
    if (/^\d+$/.test(pid)) pids.add(pid)
  }

  if (pids.size === 0) {
    console.log(`[kill-port] port ${targetPort} is already free`)
    return
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
      console.log(`[kill-port] killed PID ${pid} on port ${targetPort}`)
    } catch {
      console.log(`[kill-port] failed to kill PID ${pid}, continue`)
    }
  }
}

function killOnUnix(targetPort) {
  let output = ''
  try {
    output = execSync(`lsof -ti tcp:${targetPort}`, { encoding: 'utf8' })
  } catch (error) {
    output = String(error.stdout || '')
  }
  const pids = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line))

  if (pids.length === 0) {
    console.log(`[kill-port] port ${targetPort} is already free`)
    return
  }

  for (const pid of pids) {
    try {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
      console.log(`[kill-port] killed PID ${pid} on port ${targetPort}`)
    } catch {
      console.log(`[kill-port] failed to kill PID ${pid}, continue`)
    }
  }
}

if (process.platform === 'win32') {
  killOnWindows(port)
} else {
  killOnUnix(port)
}
