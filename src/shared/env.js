
const _runSync = require('child_process').execSync
const _pt = require('os').platform()
export const isWin = _pt === 'win32'
export const isMac = _pt === 'darwin'
export const isLinux = _pt === 'linux'

// python 是否已安装
export let hasPython
try {
  hasPython = /^hello$/.test(_runSync(`python -c "print('hello')"`).toString().trim())
} catch (_) {
  hasPython = false
}

// mac版本号
export let macVersion
// mac版本是否低于10.11
export let isOldMacVersion = false
if (isMac) {
  try {
    const result = _runSync('sw_vers').toString()
    macVersion = result.match(/ProductVersion:[ \t]*([\d.]*)/)[1]
    const matchedVersion = [10, 11, 0]
    const splited = macVersion.split('.')
    for (let i = 0; i < splited.length; i++) {
      if (splited[i] > matchedVersion[i]) {
        isOldMacVersion = false
        break
      } else if (splited[i] < matchedVersion[i]) {
        isOldMacVersion = true
        break
      } else if (i === 2 && splited[i] === matchedVersion[i]) {
        isOldMacVersion = true
      }
    }
  } catch (_) {
    // do nothing
  }
}
