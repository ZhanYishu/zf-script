const os = require('os')
const path = require('path')
const fs = require('fs-extra')

function getStorageRoot () {
  const target = path.join(os.homedir(), '.zf')
  fs.ensureDirSync(target)
  return target
}

function getStorageTemp () {
  const root = getStorageRoot()
  const temp = path.join(root, 'temp')
  fs.ensureDirSync(temp)
  return temp
}

module.exports = {
  getStorageRoot,
  getStorageTemp
}
