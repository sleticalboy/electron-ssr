import { app, BrowserWindow } from 'electron'
import { isQuiting } from './data'
import logger from './logger'

let mainWindow
let readyPromise

/** 创建主视图 */
export function createWindow () {
  if (process.platform === 'darwin') {
    app.dock.hide()
  }
  const isDev = process.env.NODE_ENV === 'development'
  mainWindow = new BrowserWindow({
    height: 440,
    width: 800,
    center: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      webSecurity: !isDev,
      nodeIntegration: true // 禁用沙盒
    }
  })
  mainWindow.setMenu(null)
  const _url = isDev ? `http://localhost:9080` : `file://${__dirname}/index.html`
  mainWindow.loadURL(_url).then(r => {
    console.log(`${__filename}: '${_url}' loaded`)
  })
  // hide to tray when window closed
  mainWindow.on('close', (e) => {
    // 当前不是退出 APP 的时候才去隐藏窗口
    if (!isQuiting()) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  readyPromise = new Promise(resolve => {
    mainWindow.webContents.once('did-finish-load', resolve)
  })
}

/** 返回主视图 */
export function getWindow () {
  return mainWindow
}

/** 显示主视图 */
export function showWindow () {
  if (mainWindow) mainWindow.show()
}

/** 隐藏主视图 */
export function hideWindow () {
  isQuiting(false)
  if (mainWindow) mainWindow.hide()
}

/** 切换窗体显隐 */
export function toggleWindow () {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
    }
  }
}

/** 销毁主视图 */
export function destroyWindow () {
  if (mainWindow) {
    mainWindow.destroy()
    mainWindow = null
  }
}

/** 向主窗口发送消息 */
export async function sendData (channel, ...args) {
  if (mainWindow) {
    await readyPromise
    console.log(`sendData() ${channel}: ${JSON.stringify(args)}`)
    mainWindow.webContents.send(channel, ...args)
  } else {
    logger.debug('not ready')
  }
}

/** 打开开发者工具 */
export async function openDevtool () {
  if (mainWindow) {
    await readyPromise
    mainWindow.webContents.openDevTools()
  } else {
    logger.debug('not ready')
  }
}
