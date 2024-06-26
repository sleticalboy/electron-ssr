import path from 'path'
import { app, dialog } from 'electron'
import logger from './logger'
import sudo from 'sudo-prompt'
import { hasPython, isLinux, isMac, isOldMacVersion, isWin } from '../shared/env'
import { init as initIcon } from '../shared/icon'

console.log('bootstrap starting...')

// app ready事件
export const readyPromise = new Promise(resolve => {
  if (app.isReady()) {
    resolve()
  } else {
    app.once('ready', resolve)
  }
})

// 检查python是否安装
if (!hasPython) {
  dialog.showErrorBox('警告', '未检测到 python' +
    '\n本程序所使用的后端为 python 版 ssr/ssrr' +
    '\n请确保已安装python且可正常使用，否则软件可能无法正常运行')
}

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

// 未捕获的 rejections
process.on('unhandledRejection', (reason, p) => {
  logger.error(`Unhandled Rejection at: Promise ${p}, reason: ${reason}`)
})

// 应用配置存储目录
export const appConfigDir = app.getPath('userData')
// 应用配置存储路径
export const appConfigPath = path.join(appConfigDir, 'gui-config.json')
// 默认的 ssr下载目录
export const defaultSSRDownloadDir = path.join(appConfigDir, 'shadowsocksr')
// pac 文件下载目录
export const pacPath = path.join(appConfigDir, 'pac.txt')
// 记录上次订阅更新时间的文件
export const subscribeUpdateFile = path.join(appConfigDir, '.subscribe.update.last')
// 当前可执行程序的路径
export const exePath = app.getPath('exe')
// windows sysproxy.exe文件的路径
let _winToolPath
if (isWin) {
  if (process.env.NODE_ENV === 'development') {
    _winToolPath = path.resolve(__dirname, '../lib/sysproxy.exe')
  } else {
    _winToolPath = path.join(exePath, '../sysproxy.exe')
  }
}
export const winToolPath = _winToolPath
// mac proxy_conf_helper工具目录
export const macToolPath = path.resolve(appConfigDir, 'proxy_conf_helper')

// try fix linux dismiss bug
if (isLinux) {
  process.env.XDG_CURRENT_DESKTOP = 'Unity'
}

// 在mac上执行sudo命令
async function sudoMacCommand (command) {
  return new Promise((resolve, reject) => {
    sudo.exec(command, { name: 'ShadowsocksR Client' }, (error, stdout, stderr) => {
      if (error || stderr) {
        reject(error || stderr)
      } else {
        resolve(stdout)
      }
    })
  })
}

/**
 * 确保文件存在，目录正常
 */
async function init () {
  initIcon()

  const _fs = require('fs-extra')
  await _fs.ensureDir(appConfigDir)
  // 判断配置文件是否存在，不存在用默认数据写入
  const configFileExists = await _fs.pathExists(appConfigPath)
  if (!configFileExists) {
    await _fs.outputJson(appConfigPath, require('../shared/config'), { spaces: '\t' })
  }
  await _fs.ensureDir(path.join(appConfigDir, 'logs'))

  // 初始化确保文件存在, 10.11版本以下不支持该功能
  if (isMac && !isOldMacVersion && !await _fs.pathExists(macToolPath)) {
    const helperPath = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../lib/proxy_conf_helper')
      : path.join(exePath, '../../../Contents/proxy_conf_helper')
    await sudoMacCommand(`cp ${helperPath} "${macToolPath}" && chown root:admin "${macToolPath}" && chmod a+rx "${macToolPath}" && chmod +s "${macToolPath}"`)
  }
  return readyPromise
}

console.log(`bootstrap, proc: ${process.type}`)
export default init()
