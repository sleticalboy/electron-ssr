import { app, clipboard, shell } from 'electron'
import bootstrapPromise, { appConfigPath } from './bootstrap'
import { sendData, showWindow } from './window'
import { currentConfig, updateAppConfig } from './data'
import { showNotification } from './notification'
import * as events from '../shared/events'

export { openDevtool } from './window'
export { updateSubscribes } from './subscribe'

const _fs = require('fs-extra')

const _dumpMenu = (e, where) => {
  console.log(`${where}() called with: ${e} => label: ${e.label} enabled: ${e.enabled}, proc: ${process.type}`)
  Object.keys(e).forEach(key => console.log(`menu.${key}: ${e[key]}`))
}

// 切换启用状态
export function toggleEnable () {
  updateAppConfig({ enable: !currentConfig.enable })
}

// 切换代理方式
export function toggleProxy (mode) {
  require('./proxy').startProxy(mode)
  updateAppConfig({ sysProxyMode: mode })
}

// 更新 pac
export function updatePac (e) {
  _dumpMenu(e, 'updatePac')
  require('./pac').downloadPac(true).then(() => {
    showNotification('PAC 文件更新成功')
  }).catch(() => {
    showNotification('PAC 文件更新失败')
  })
}

// 打开选项设置页面
export function openOptionsWindow () {
  sendData(events.EVENT_APP_SHOW_PAGE, 'Options').then(r => {
  })
}

// 导入配置文件
export function importConfigFromFile () {
  const _path = require('../shared/dialog').chooseFile('选择gui-config.json', [{ name: 'Json', extensions: ['json'] }])
  if (_path) {
    _fs.readJson(_path).then(fileConfig => {
      updateAppConfig(fileConfig, false, true)
    }).catch(() => {
    })
  }
}

// 导出配置文件
export function exportConfigToFile () {
  const _path = require('../shared/dialog').chooseSavePath('选择导出的目录')
  if (_path) {
    _fs.writeJson(require('path').join(_path, 'gui-config.json'), currentConfig, { spaces: '\t' })
  }
}

// 从剪贴板批量导入
export function importConfigFromClipboard () {
  const parsed = require('../shared/ssr').loadConfigsFromString(clipboard.readText().trim())
  if (parsed.length) {
    updateAppConfig({ configs: [...currentConfig.configs, ...parsed] })
  }
  showNotification(parsed.length ? `已导入${parsed.length}条数据` : '从剪贴板中导入失败')
}

// 打开配置文件
export async function openConfigFile () {
  await bootstrapPromise
  shell.openItem(appConfigPath)
}

// 打开日志文件
export async function openLog () {
  await bootstrapPromise
  shell.openItem(require('./logger').logPath)
}

// 打开选项设置页面
export function showOptions () {
  showWindow()
  sendData(events.EVENT_APP_SHOW_PAGE, { page: 'Options' }).then(r => {
  })
}

// 打开订阅管理页面
export function showSubscribes () {
  showWindow()
  sendData(events.EVENT_APP_SHOW_PAGE, { page: 'Options', tab: 'subscribes' }).then(r => {
  })
}

// 打开服务器编辑窗口
export function showManagePanel () {
  showWindow()
  sendData(events.EVENT_APP_SHOW_PAGE, { page: 'ManagePanel' }).then(r => {
  })
}

// 复制http代理命令行代码
export function copyHttpProxyCode () {
  clipboard.writeText(`export http_proxy="http://127.0.0.1:${currentConfig.httpProxyPort}"
export https_proxy="http://127.0.0.1:${currentConfig.httpProxyPort}"`)
}

// 打开窗口
export function showMainWindow () {
  showWindow()
}

// 打开指定的 url
export function openURL (url) {
  return shell.openExternal(url)
}

// 退出
export function exitApp () {
  app.quit()
}

/** 切换服务器 */
export function changeServer (e) {
  _dumpMenu(e, 'changeServer')
  const newIndex = currentConfig.configs.findIndex(config => config.id === e.id)
  if (newIndex === currentConfig.selectedIndex) { // 点击的是当前节点，不需要处理
    e.checked = true
  } else {
    // 更改选中的 ssr 配置
    updateAppConfig({ newIndex })
  }
}
