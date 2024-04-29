import { Menu, nativeImage, Tray } from 'electron'
import { appConfig$ } from './data'
import * as handler from './tray-handler'
import { groupConfigs } from '../shared/utils'
import { isMac, isOldMacVersion, isWin } from '../shared/env'
import {
  disabledTray,
  enabledHighlightTray,
  enabledTray,
  globalHighlightTray,
  globalTray,
  pacHighlightTray,
  pacTray
} from '../shared/icon'

let tray

/**
 * 生成服务器子菜单
 * @param {Object[]} configs ssr 配置集合
 * @param {Number} selectedIndex 选中的 ssr 配置的索引
 */
function generateConfigSubmenus (configs, selectedIndex) {
  const cfgGroups = groupConfigs(configs, selectedIndex)
  const groups = Object.keys(cfgGroups).map(key => {
    let index = 0
    return {
      label: `${cfgGroups[key].some(config => config.checked) ? '● ' : ''}分组：${key}`,
      submenu: cfgGroups[key].map(config => {
        const pieces = config.remarks.split(' ')
        const desc = pieces.length > 3
          ? [pieces[0], pieces[1], pieces[pieces.length - 1]].join(' ')
          : config.remarks
        return {
          id: config.id,
          label: `${++index}. ${config.server}:${config.server_port} (${desc})`,
          type: 'checkbox',
          checked: config.checked,
          click: handler.changeServer
        }
      })
    }
  })
  const submenus = []
  if (groups.length > 0) {
    // 过滤子菜单
    const filterSubmenus = (rawItems, limit = 15) => {
      if (rawItems.length <= limit) return rawItems
      const ouput = []
      for (let i = 0; i < rawItems.length; i++) {
        if (i <= limit - 1) {
          ouput.push(rawItems[i])
        } else {
          // 超过 limit 个的部分不显示
          ouput.push({
            id: 'show-more',
            label: '显示更多...',
            click: handler.showMainWindow
          })
          break
        }
      }
      return ouput
    }
    if (groups.length === 1) {
      submenus.push(...filterSubmenus(groups[0].submenu))
    } else {
      for (let i = 0; i < groups.length; i++) {
        submenus.push({
          label: `${i + 1}. ${groups[i].label}`,
          submenu: filterSubmenus(groups[i].submenu)
        })
      }
    }
    submenus.push({ type: 'separator' })
  } else {
    submenus.push({ label: 'none', enabled: false })
  }
  submenus.push({ label: '编辑服务器', click: handler.showManagePanel })
  submenus.push({ label: '订阅管理', click: handler.showSubscribes })
  submenus.push({ label: '更新订阅服务器', click: handler.updateSubscribes })
  return submenus
}

/**
 * 根据应用配置生成菜单
 * @param {Object} appConfig 应用配置
 */
function generateMenus (appConfig) {
  const base = [
    { label: '主界面', click: handler.showManagePanel },
    {
      label: '开启应用', type: 'checkbox', checked: appConfig.enable, click: () => {
        handler.toggleEnable()
        handler.toggleProxy(appConfig.sysProxyMode)
      }
    },
    { label: '更新 PAC 文件', click: handler.updatePac },
    { label: '服务器', submenu: generateConfigSubmenus(appConfig.configs, appConfig.index) },
    {
      label: '配置', submenu: [
        { label: '选项设置...', click: handler.showOptions },
        { label: '导入gui-config.json文件', click: handler.importConfigFromFile },
        { label: '导出gui-config.json文件', click: handler.exportConfigToFile },
        { label: '从剪贴板批量导入ssr://地址', click: handler.importConfigFromClipboard },
        { label: '打开配置文件', click: handler.openConfigFile }
      ]
    },
    { label: '复制 http 代理设置', click: handler.copyHttpProxyCode },
    {
      label: '帮助', submenu: [
        { label: '查看日志', click: handler.openLog },
        { label: '打开开发者工具', click: handler.openDevtool }
      ]
    },
    { label: '退出', click: handler.exitApp }
  ]
  if (!isOldMacVersion) {
    base.splice(1, 0,
      {
        label: '系统代理模式        ', submenu: [
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
      }
    )
  }
  return base
}

// 切换代理
export function changeProxy (e, mode, appConfig) {
  if (mode === appConfig.sysProxyMode) {
    e.checked = true
  } else {
    handler.toggleProxy(mode)
  }
}

// 根据配置显示 tray tooltip
function getTooltip (appConfig) {
  if (!appConfig.enable) {
    return 'ShadowsocksR客户端：应用未启动'
  }
  const arr = []
  if (appConfig.enable) {
    arr.push('ShadowsocksR客户端：应用已启动\n')
  }
  arr.push('代理启动方式：')
  if (appConfig.sysProxyMode === 0) {
    arr.push('未启用代理')
  } else if (appConfig.sysProxyMode === 1) {
    arr.push('PAC代理')
  } else if (appConfig.sysProxyMode === 2) {
    arr.push('全局代理')
  }
  const selectedConfig = appConfig.configs[appConfig.index]
  if (selectedConfig) {
    arr.push('\n')
    arr.push(`${selectedConfig.group ? selectedConfig.group + ' - ' : ''}${selectedConfig.remarks || (selectedConfig.server + ':' + selectedConfig.server_port)}`)
  }
  return arr.join('')
}

/**
 * 更新任务栏菜单
 * @param {Object} appConfig 应用配置
 */
function updateTray (appConfig) {
  const menus = generateMenus(appConfig)
  const contextMenu = Menu.buildFromTemplate(menus)
  tray.setContextMenu(contextMenu)
  tray.setToolTip(getTooltip(appConfig))
}

// 根据应用状态显示不同的图标
function setTrayIcon (appConfig) {
  if (appConfig.enable) {
    if (appConfig.sysProxyMode === 1) {
      tray.setImage(pacTray)
      isMac && tray.setPressedImage(pacHighlightTray)
    } else if (appConfig.sysProxyMode === 2) {
      tray.setImage(globalTray)
      isMac && tray.setPressedImage(globalHighlightTray)
    } else {
      tray.setImage(enabledTray)
      isMac && tray.setPressedImage(enabledHighlightTray)
    }
  } else {
    tray.setImage(disabledTray)
    isMac && tray.setPressedImage(disabledTray)
  }
}

/**
 * 渲染托盘图标和托盘菜单
 */
export default function renderTray (appConfig) {
  // 生成tray
  tray = new Tray(nativeImage.createEmpty())
  updateTray(appConfig)
  setTrayIcon(appConfig)
  tray.on((isMac || isWin) ? 'double-click' : 'click', handler.showMainWindow)
}

/**
 * 销毁托盘
 */
export function destroyTray () {
  if (tray) {
    tray.destroy()
  }
}

// 监听数据变更
appConfig$.subscribe(data => {
  const [appConfig, changed] = data
  if (!changed.length) {
    renderTray(appConfig)
  } else {
    if (['configs', 'index', 'enable', 'sysProxyMode'].some(key => changed.indexOf(key) > -1)) {
      updateTray(appConfig)
    }
    if (['enable', 'sysProxyMode'].some(key => changed.indexOf(key) > -1)) {
      setTrayIcon(appConfig)
    }
  }
})
