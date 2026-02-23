此目录在构建时自动生成，不纳入版本控制。

运行以下命令准备资源：
  node scripts/prepare-node.js      # 下载 Node.js 运行时到 bundled/node/
  node scripts/prepare-openclaw.js  # 从本地仓库构建并复制到 bundled/openclaw/
