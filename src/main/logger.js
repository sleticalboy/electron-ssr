import * as Sentry from '@sentry/electron'

if (process.env.NODE_ENV === 'production') {
  Sentry.init({ dsn: 'https://39bffe7372d14000bd5d30e50a27c388@sentry.io/1359858' })
}

const _path = require('path')
const _logFolder = _path.join(require('electron').app.getPath('userData'), 'logs')
require('fs-extra').ensureDirSync(_logFolder)

export const logPath = _path.join(_logFolder, 'shadowsocksr-client.log')
const log = require('electron-log')
log.transports.file.file = logPath
log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}:{ms} [{level}] {text}'
log.transports.file.maxSize = 5 * 1024 * 1024
log.transports.file.level = 'info'
log.transports.console.format = '{y}-{m}-{d} {h}:{i}:{s}:{ms} [{level}] {text}'
log.transports.console.level = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

export default log
