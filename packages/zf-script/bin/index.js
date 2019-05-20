#!/usr/bin/env node

const updateNotifier = require('update-notifier')
const program = require('commander')
const pkg = require('../package.json')
const generate = require('../lib/generate')

const notifier = updateNotifier({ pkg })
notifier.notify()

if (notifier.update) {
  process.exit(1)
}

program
.version(pkg.version)
.command('init <template> <name>')
.action((template, name) => {
  generate(template, name, { name })
})

program.parse(process.argv)
