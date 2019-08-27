#!/usr/bin/env node
'use strict'

const pkgName = 'gameplan'

process.title = pkgName

const path = require('path')
const util = require('util')
const os = require('os')
const yargs = require('yargs')
const { run, errors } = require('../index')

// Yarn create ignores the '--', so we need another way to separate args for
// this module and the commands for the template module
let moduleArgs = []
if (process.argv.includes('---')) {
  moduleArgs = process.argv
    .splice(process.argv.indexOf('---'), process.argv.length - 1)
    .slice(1)
}

const argv = yargs
  .usage(`Usage: $0 <repo> <name> [options] -- [${pkgName}-options]`)
  .option('prompt', {
    alias: 'p',
    type: 'boolean',
    describe: `Prompt for options from ${pkgName}`
  })
  .demandCommand(2, 2, '<repo> and <name> are required', 'Too many arguments')
  .help()
  .showHelpOnFail(true)
  .strict(true)
  .parserConfiguration({
    'populate--': true
  })
  .parse(process.argv.slice(2))

const {
  _: [repo, name],
  prompt,
  '--': args = []
} = argv

const cwd = process.cwd()

run({
  destinationDirectory: path.join(cwd, name),
  temporaryDirectory: os.tmpdir(),
  repo,
  prompt,
  args: args.concat(moduleArgs)
})
  .then(({ destinationDirectory }) => {
    const relativePath = path.relative(cwd, destinationDirectory)
    console.log()
    console.log('Done!')
    console.log()
    if (relativePath) {
      console.log('Now run:')
      console.log()
      console.log(`  cd ${relativePath}`)
      console.log()
    }
  })
  .catch(err => {
    if (err instanceof errors.DirectoryNotEmpty) {
      console.error(err.message)
      console.error()
      console.error('The target directory must be empty ')
      process.exit(1)
    }
    if (err instanceof errors.InvalidOptionDefinitions) {
      console.error(`Invalid option definitions from ${pkgName} module.`)
      console.error(`Please speak with the author of the ${repo} repo.`)
      console.error()
      console.error('Details:')
      console.error(util.inspect(err.errors, false, Infinity, true))
      process.exit(1)
    }
    if (err instanceof errors.InvalidRunMethod) {
      console.error(`Invalid run method from ${pkgName} module.`)
      console.error(`Please speak with the author of the ${repo} repo`)
      process.exit(1)
    }
    if (err instanceof errors.OutOfBoundsFile) {
      console.error(`Invalid operation from ${pkgName} module.`)
      console.error(`Please speak with the author of the ${repo} repo`)
      console.error()
      console.error('Details:')
      console.error(err.message)
      process.exit(1)
    }
    if (err instanceof errors.UndefinedTemplateVariable) {
      console.error(err.message)
      console.error(`Please speak with the author of the ${repo} repo`)
      process.exit(1)
    }
    if (err instanceof errors.SpawnError) {
      console.error('Spawn process error:')
      console.error()
      console.error(err.message)
      process.exit(err.details.code)
    }
    console.error(err)
    process.exit(1)
  })
