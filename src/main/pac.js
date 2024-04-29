/**
 * pac文件下载更新等
 */
import http from 'http'
import httpShutdown from 'http-shutdown'
import { dialog } from 'electron'
import logger from './logger'
import { request } from '../shared/utils'
import bootstrapPromise, { appConfigDir, pacPath } from './bootstrap'
import { appConfig$, currentConfig } from './data'
import { isHostPortValid } from './port'

const _fs = require('fs-extra')

let pacServer

httpShutdown.extend()

/** 下载 pac 文件 */
export async function downloadPac (force = false) {
  await bootstrapPromise
  // 不挂代理的情况下下载不到这个文件
  // 重新实现：更新 git 项目、执行脚本
  if (force || !_fs.pathExistsSync(pacPath)) {
    console.log('start download pac.txt to ' + pacPath)
    const _url = 'https://raw.githubusercontent.com/shadowsocksrr/pac.txt/pac/pac.txt'
    return new Promise((resolve, reject) => {
      request(_url, false).then(buf => _fs.writeFile(pacPath, buf)).then(_ => resolve(pacPath))
        .catch(err => {
          // 发生错误， 重试
          console.log(err)
          const _scriptDir = require('path').join(appConfigDir, 'gfwlist')
          const _cp = require('child_process')
          if (!_fs.pathExistsSync(_scriptDir)) {
            // clone 工程
            try {
              _cp.execSync(`git clone --depth=1 git@github.com:gfwlist/gfwlist.git ${_scriptDir}`)
            } catch (e) { // 发生错误
              return reject(`download failed: ${err}`)
            }
          }
          try {
            _cp.execSync(`cd ${_scriptDir} && bash update_pac.sh && cp pac.txt ${pacPath}`)
          } catch (err) { // 发生错误
            return reject(`update pac failed: ${err}`)
          }
        })
    })
  }
  // 读取 pac 文件内容
  return Promise.resolve(pacPath)
}

/** pac server */
export async function serverPac (appConfig, isProxyStarted) {
  if (isProxyStarted) {
    const host = currentConfig.shareOverLan ? '0.0.0.0' : '127.0.0.1'
    const port = appConfig.pacPort !== undefined ? appConfig.pacPort : currentConfig.pacPort || 1240
    isHostPortValid(host, port).then(() => {
      pacServer = http.createServer((req, res) => {
        if (require('url').parse(req.url).pathname === '/proxy.pac') {
          downloadPac().then(_ => _fs.readFile(pacPath)).then(buf => buf.toString())
            .then(text => {
              res.writeHead(200, {
                'Content-Type': 'application/x-ns-proxy-autoconfig',
                'Connection': 'close'
              })
              const addr = `127.0.0.1:${appConfig.localPort}`
              const proxyAddrOrNull = appConfig.httpProxyEnable ? `PROXY ${addr};` : ''
              res.write(text.replace(/__PROXY__/g, `SOCKS5 ${addr}; SOCKS ${addr}; PROXY ${addr}; ${proxyAddrOrNull} DIRECT`))
              res.end()
            })
        } else {
          res.writeHead(200)
          res.end()
        }
      }).withShutdown().listen(port, host)
        .on('listening', () => {
          logger.info(`pac server listen at: ${host}:${port}`)
        })
        .once('error', err => {
          logger.error(`pac server error: ${err}`)
          pacServer.shutdown()
        })
    }).catch(() => {
      dialog.showMessageBox({
        type: 'warning',
        title: '警告',
        message: `PAC端口 ${port} 被占用`
      })
    })
  }
}

/** 关闭 pac 服务 */
export async function stopPacServer () {
  if (pacServer && pacServer.listening) {
    return new Promise((resolve, reject) => {
      pacServer.shutdown(err => {
        if (err) {
          logger.warn(`close pac server error: ${err}`)
          reject()
        } else {
          logger.info('pac server closed.')
          resolve()
        }
      })
    })
  }
  return Promise.resolve()
}

// 监听配置变化
appConfig$.subscribe(data => {
  const [appConfig, changed, , isProxyStarted, isOldProxyStarted] = data
  // 初始化
  if (changed.length === 0) {
    serverPac(appConfig, isProxyStarted).then(r => {
    })
  } else {
    if (changed.indexOf('pacPort') > -1 || isProxyStarted !== isOldProxyStarted) {
      stopPacServer().then(() => {
        serverPac(appConfig, isProxyStarted).then(r => {
        })
      })
    }
  }
})
