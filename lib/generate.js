const path = require('path')
const ora = require('ora')
const fs = require('fs-extra')
const klaw = require('klaw')
const template = require('art-template')
const clone = require('gh-clone')
const { getStorageTemp } = require('./utils')
const helpers = require('./helpers')
const { templatesRepo } = require('../config')

const noop = () => {}
const RE_INTERPOLATE = /<%=([\s\S]+?)%>/g
const RE_TYPES = /png|jpg|jpeg|svg|ico|bmp|webp|woff|woff2|ttf|eot$/
const RE_PLACEHOLDER = /\[([^\]]+)\]/g

function generateFiles (templatePath, dir, meta) {
  const filesPath = path.join(templatePath, './files')
  
  return Promise
  .resolve()
  .then(() => new Promise((resolve) => {
    const items = []
    klaw(filesPath)
    .on('data', item => {
      if (item.stats.isFile()) {
        items.push(item.path)
      }
    })
    .on('end', () => resolve(items))
  }))
  .then(files => {
    return Promise
    .all(files.map(file => {
      let target = path.join(dir, path.relative(filesPath, file))
      
      // filename with `[metadata]`
      target = target.replace(RE_PLACEHOLDER, (m, n) => meta[n] || '')
      
      return RE_TYPES.test(path.extname(target))
        ? copyFile(file, target)
        : makeFile(file, target, meta)
    }))
  })
}

function copyFile (file, target) {
  return fs.ensureDir(path.dirname(target))
  .then(() => fs.copyFile(file, target))
}

function makeFile (file, target, meta) {
  return new Promise((resolve, reject) => {
    const template = template(file, meta)
    
    fs.outputFile(target, template, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

module.exports = function generate (template, dir, meta) {
  const tempDir = getStorageTemp()
  const cloneDir = path.join(tempDir, templatesRepo.split('/')[1].split('.')[0])
  const templatePath = path.join(cloneDir, template)
  
  let preTemplate, postTemplate, spinner
  
  if (fs.existsSync(dir)) {
    const info = `${dir} 目录已存在`
    console.error(info)
    return
  }
  
  return Promise
  .resolve()
  .then(() => {
    spinner = ora('Fetching template from Gitlab').start()
  })
  .then(() => clone(templatesRepo, { dest: cloneDir, silent: true }))
  .then(() => {
    spinner.stop()
    spinner = ora('Generating files').start()
  })
  .then(() => {
    const scripts = require(path.join(templatePath, './index.js'))
    preTemplate = scripts.preTemplate || noop
    postTemplate = scripts.postTemplate || noop
  })
  .then(() => preTemplate(templatePath, dir, meta, helpers))
  .then(() => generateFiles(templatePath, dir, meta))
  .then(() => postTemplate(templatePath, dir, meta, helpers))
  .then(() => fs.remove(cloneDir))
  .then(() => {
    spinner.stop()
  })
  .catch((err) => {
    fs.removeSync(cloneDir)
    spinner.stop()
    console.error(err)
  })
}
