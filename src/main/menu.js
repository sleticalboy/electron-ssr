import { app, Menu } from 'electron'
import { appConfig$, currentConfig } from './data'
import { changeProxy } from './tray'
import * as handler from './tray-handler'
import { isLinux, isMac } from '../shared/env'

let showLinuxMenu = false

function renderMenu (appConfig) {
  // mac需要加上默认的一些菜单，否则没法复制粘贴
  let template
  if (isMac) {
    template = [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }, {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteandmatchstyle' },
        { role: 'delete' },
        { role: 'selectall' }
      ]
    }]
  } else if (isLinux) {
    if (showLinuxMenu) {
      template = [
        {
          label: '应用', submenu: [
            { label: '开启应用', type: 'checkbox', checked: appConfig.enable, click: handler.toggleEnable },
            { label: '复制 http 代理设置', click: handler.copyHttpProxyCode },
            { label: '退出', click: handler.exitApp }
          ]
        },
        {
          label: '系统代理模式', submenu: [
            {
              label: '不启用代理',
              type: 'checkbox',
              checked: appConfig.sysProxyMode === 0,
              click: e => changeProxy(e, 0, appConfig)
            },
            {
              label: 'PAC代理',
              type: 'checkbox',
              checked: appConfig.sysProxyMode === 1,
              click: e => changeProxy(e, 1, appConfig)
            },
            {
              label: '全局代理',
              type: 'checkbox',
              checked: appConfig.sysProxyMode === 2,
              click: e => changeProxy(e, 2, appConfig)
            }
          ]
        },
        {
          label: '更新 PAC 文件', click: handler.updatePac
        },
        {
          label: '配置', submenu: [
            { label: '导入gui-config.json文件', click: handler.importConfigFromFile },
            { label: '导出gui-config.json文件', click: handler.exportConfigToFile },
            { label: '打开配置文件', click: handler.openConfigFile }
          ]
        },
        {
          label: '帮助', submenu: [
            { label: '查看日志', click: handler.openLog },
            { label: '打开开发者工具', click: handler.openDevtool }
          ]
        }
      ]
    }
  }
  template && Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/**
 * 切换是否显示menu
 */
export function toggleMenu () {
  if (isLinux) {
    if (Menu.getApplicationMenu()) {
      showLinuxMenu = false
      Menu.setApplicationMenu(null)
    } else {
      showLinuxMenu = true
      renderMenu(currentConfig)
    }
  }
}

// 监听数据变更
appConfig$.subscribe(data => {
  const [appConfig, changed] = data
  if (!changed.length) {
    renderMenu(appConfig)
  } else {
    if (['enable', 'sysProxyMode'].some(key => changed.indexOf(key) > -1)) {
      renderMenu(appConfig)
    }
  }
})
