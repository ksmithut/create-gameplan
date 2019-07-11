'use strict'

const path = require('path')
const yargsModule = require('yargs/yargs')
const AJV = require('ajv')
const inquirer = require('inquirer')
const fsAsync = require('./lib/fs-async')
const { spawnAsync, SpawnError } = require('./lib/spawn-async')
const objectMap = require('./lib/object-map')
const isObject = require('./lib/is-object')
const { template, UndefinedTemplateVariable } = require('./lib/template')
const flatten = require('./lib/flatten')

class InvalidOptionDefinitions extends Error {
  constructor (errors) {
    super(`Invalid option definitions`)
    Error.captureStackTrace(this, this.constructor)
    this.code = 'INVALID_OPTION_DEFINITIONS'
    this.errors = errors.slice()
  }

  static get OPTIONS_DEFINITION_SCHEMA () {
    return {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['type', 'default'],
        additionalProperties: false,
        properties: {
          type: {
            type: 'string',
            enum: ['string', 'boolean']
          },
          description: {
            type: 'string'
          },
          prompt: {
            type: 'string'
          },
          choices: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          default: {}
        }
      }
    }
  }

  static assert (value) {
    const ajv = new AJV({ allErrors: true })
    const valid = ajv.validate(
      InvalidOptionDefinitions.OPTIONS_DEFINITION_SCHEMA,
      value
    )
    if (!valid) {
      throw new InvalidOptionDefinitions(ajv.errors.slice())
    }
  }
}

class DirectoryNotEmpty extends Error {
  constructor (directory) {
    super(`${directory} is not empty`)
    Error.captureStackTrace(this, this.constructor)
    this.code = 'DIRECTORY_NOT_EMPTY'
  }

  static async assertAsync (directory) {
    if (!(await fsAsync.dirIsEmpty(directory))) {
      throw new DirectoryNotEmpty(directory)
    }
  }
}

class InvalidRunMethod extends Error {
  constructor () {
    super(`gameplan module must have a run method`)
    Error.captureStackTrace(this, this.constructor)
    this.code = 'INVALID_RUN_METHOD'
  }

  static assert (gameplan) {
    if (typeof gameplan.run !== 'function') {
      throw new InvalidRunMethod()
    }
  }
}

class OutOfBoundsFile extends Error {
  constructor (directory, filepath) {
    super(`${filepath} does not reside within ${directory}`)
    Error.captureStackTrace(this, this.constructor)
    this.code = 'OUT_OF_BOUNDS_FILE'
    this.details = {
      directory,
      filepath
    }
  }

  static assert (directory, filepath) {
    const isFileInsideDirectory = !path
      .relative(directory, filepath)
      .startsWith('..')
    if (!isFileInsideDirectory) {
      throw new OutOfBoundsFile(directory, filepath)
    }
  }
}

const resolvePath = (directory, innerPath) => {
  innerPath = flatten(innerPath)
  const joinedInnerPath = path.join(...innerPath)
  const absoluteInnerPath = path.resolve(directory, joinedInnerPath)
  OutOfBoundsFile.assert(directory, absoluteInnerPath)
  return absoluteInnerPath
}

const parseCommandLineArguments = (optionDefinitions, args, repo) => {
  const yargsOptions = objectMap(optionDefinitions, value => {
    const option = {
      type: value.type,
      description: value.description,
      default: value.default
    }
    if (value.choices) option.choices = value.choices
    return option
  })
  const parsedOptions = yargsModule(args)
    .usage(`Usage: $0 ${repo} <folder> -- [gameplan-options]`)
    .options(yargsOptions)
    .strict(true)
    .parse()
  return objectMap(optionDefinitions, (value, key) => parsedOptions[key])
}

const promptForOptions = async (optionDefinitions, defaults) => {
  const optionPrompt = inquirer.createPromptModule()
  const inquirerQuestions = Object.entries(optionDefinitions).map(
    ([name, value]) => {
      let type
      switch (value.type) {
        case 'string':
          type = value.choices ? 'list' : 'string'
          break
        case 'boolean':
          type = 'confirm'
          break
      }
      return {
        type,
        name,
        default: defaults[name],
        choices: value.choices,
        message: value.prompt || value.description || `${name}:`
      }
    }
  )
  return Object.assign({}, defaults, await optionPrompt(inquirerQuestions))
}

const runGameplan = async (
  gameplan,
  options,
  sourceDirectory,
  destinationDirectory
) => {
  const todos = []
  const operations = {
    copy: (fromPath, toPath) => {
      const from = resolvePath(sourceDirectory, fromPath)
      const to = resolvePath(destinationDirectory, toPath)
      const dirnameTo = path.dirname(to)
      todos.push(async () => {
        await fsAsync.mkdir(dirnameTo, { recursive: true })
        await fsAsync.copyFile(from, to)
      })
    },
    template: (fromPath, toPath, variables) => {
      if (!isObject(variables)) {
        throw new TypeError(`template variables must be an object`)
      }
      const from = resolvePath(sourceDirectory, fromPath)
      const to = resolvePath(destinationDirectory, toPath)
      const dirnameTo = path.dirname(to)
      todos.push(async () => {
        await fsAsync.mkdir(dirnameTo, { recursive: true })
        const contents = await fsAsync.readFile(from, 'utf8')
        const replacedContents = template(contents, variables)
        await fsAsync.writeFile(to, replacedContents, { mode: 0o644 })
      })
    },
    json: (fromObject, toPath) => {
      const to = resolvePath(destinationDirectory, toPath)
      const dirnameTo = path.dirname(to)
      const contents = JSON.stringify(fromObject, null, 2)
      todos.push(async () => {
        await fsAsync.mkdir(dirnameTo, { recursive: true })
        await fsAsync.writeFile(to, contents, { mode: 0o644 })
      })
    },
    spawn: (command, ...args) => {
      args = flatten(args)
      todos.push(async () => {
        await spawnAsync(command, args, {
          cwd: destinationDirectory,
          stdio: 'inherit'
        })
      })
    }
  }
  await gameplan.run({ options, operations })
  await todos.reduce(async (prev, todo) => {
    await prev
    await todo()
  }, null)
}

const run = async ({
  destinationDirectory,
  temporaryDirectory,
  repo,
  prompt = false,
  args = []
}) => {
  await fsAsync.mkdir(destinationDirectory, { recursive: true })
  await DirectoryNotEmpty.assertAsync(destinationDirectory)
  const sourceDirectory = await fsAsync.mkdtemp(
    path.join(temporaryDirectory, 'gameplan-')
  )
  try {
    await spawnAsync('git', ['clone', '--depth=1', repo, sourceDirectory])
    const gameplan = require(sourceDirectory)
    InvalidRunMethod.assert(gameplan)
    const optionDefinitions =
      typeof gameplan.options === 'function'
        ? gameplan.options({ directory: destinationDirectory })
        : {}
    InvalidOptionDefinitions.assert(optionDefinitions)
    let options = parseCommandLineArguments(optionDefinitions, args, repo)
    if (prompt) options = await promptForOptions(optionDefinitions, options)
    await runGameplan(gameplan, options, sourceDirectory, destinationDirectory)
    return {
      destinationDirectory
    }
  } finally {
    await fsAsync.rmdirRecursive(sourceDirectory)
  }
}

exports.run = run
exports.errors = {
  SpawnError,
  InvalidOptionDefinitions,
  DirectoryNotEmpty,
  InvalidRunMethod,
  OutOfBoundsFile,
  UndefinedTemplateVariable
}
