/**
 * prepare-node.js — 下载 Node.js 运行时到 bundled/node/
 *
 * 只下载单个 node.exe（Windows），适合快速构建。
 * 如需其他平台，可扩展。
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

const NODE_VERSION = '22.14.0'
const TARGET_DIR = path.join(__dirname, '..', 'bundled', 'node')

const PLATFORM_CONFIG = {
  win32: {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/win-x64/node.exe`,
    file: 'node.exe',
    minSize: 50 * 1024 * 1024,
  },
  darwin: {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    file: 'node',
    minSize: 30 * 1024 * 1024,
  },
  linux: {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz`,
    file: 'node',
    minSize: 30 * 1024 * 1024,
  },
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`下载: ${url}`)
    console.log(`目标: ${dest}`)

    const file = fs.createWriteStream(dest)

    function doRequest(urlStr) {
      https.get(urlStr, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close()
          return doRequest(response.headers.location)
        }
        if (response.statusCode !== 200) {
          file.close()
          fs.unlinkSync(dest)
          return reject(new Error(`HTTP ${response.statusCode}`))
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10)
        let downloaded = 0

        response.on('data', (chunk) => {
          downloaded += chunk.length
          if (totalSize > 0) {
            const pct = ((downloaded / totalSize) * 100).toFixed(1)
            process.stdout.write(`\r  进度: ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`)
          }
        })

        response.pipe(file)
        file.on('finish', () => {
          file.close()
          console.log('\n  下载完成!')
          resolve()
        })
      }).on('error', (err) => {
        file.close()
        try { fs.unlinkSync(dest) } catch { /* ignore */ }
        reject(err)
      })
    }

    doRequest(url)
  })
}

async function main() {
  const platform = process.platform
  const config = PLATFORM_CONFIG[platform]

  if (!config) {
    console.error(`不支持的平台: ${platform}`)
    process.exit(1)
  }

  console.log(`\n=== 准备 Node.js ${NODE_VERSION} 运行时 ===\n`)

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true })
  }

  const targetFile = path.join(TARGET_DIR, config.file)

  if (fs.existsSync(targetFile)) {
    const stats = fs.statSync(targetFile)
    if (stats.size > config.minSize) {
      console.log(`已存在 ${config.file} (${(stats.size / 1024 / 1024).toFixed(1)} MB)，跳过下载`)
      return
    }
    console.log(`文件不完整，重新下载...`)
  }

  await download(config.url, targetFile)

  if (platform !== 'win32') {
    fs.chmodSync(targetFile, 0o755)
  }

  const stats = fs.statSync(targetFile)
  console.log(`node 大小: ${(stats.size / 1024 / 1024).toFixed(1)} MB`)
  console.log('Node.js 运行时准备完成!\n')
}

main().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
