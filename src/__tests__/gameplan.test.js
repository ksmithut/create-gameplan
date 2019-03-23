/* eslint-env jest */
'use strict'

const os = require('os')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const assertDirEqual = require('assert-dir-equal')
const { __onPrompt, __clearOnPrompt } = require('inquirer')
const { run, errors } = require('../index')
const { spawnAsync } = require('../lib/spawn-async')

const mkdir = promisify(fs.mkdir)
const rmdirRecursive = promisify(rimraf)
const readdir = promisify(fs.readdir)

const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const FIXTURES = path.join(PROJECT_ROOT, 'src', '__fixtures__')
const SOURCES = path.join(FIXTURES, 'sources')
const SNAPSHOTS = path.join(FIXTURES, 'snapshots')
const WORKING_DIRECTORY = path.join(PROJECT_ROOT, '.test-output')

const eachSource = async eacher => {
  const sources = await readdir(SOURCES, { withFileTypes: true })
  await Promise.all(
    sources
      .filter(entry => entry.isDirectory())
      .map(entry => eacher(path.join(SOURCES, entry.name)))
  )
}

describe('gameplan', () => {
  beforeAll(async () => {
    await rmdirRecursive(WORKING_DIRECTORY)
    await mkdir(WORKING_DIRECTORY, { recursive: true })
    await eachSource(async source => {
      const spawnOptions = { stdio: 'ignore', cwd: source }
      await spawnAsync('git', ['init'], spawnOptions)
      await spawnAsync('git', ['add', '.'], spawnOptions)
      await spawnAsync('git', ['commit', '-m', 'init'], spawnOptions)
    })
  })
  afterAll(async () => {
    await rmdirRecursive(WORKING_DIRECTORY)
    await eachSource(source => rmdirRecursive(path.join(source, '.git')))
  })

  afterEach(async () => {
    __clearOnPrompt()
  })

  test('runs a basic gameplan', async () => {
    await run({
      destinationDirectory: path.join(WORKING_DIRECTORY, 'test1'),
      temporaryDirectory: os.tmpdir(),
      repo: path.join(SOURCES, 'base-gameplan')
    })
    assertDirEqual(
      path.join(WORKING_DIRECTORY, 'test1'),
      path.join(SNAPSHOTS, 'basic')
    )
  })

  test('fails if the directory is not empty', async () => {
    await mkdir(path.join(WORKING_DIRECTORY, 'test2', 'not-empty'), {
      recursive: true
    })
    await expect(
      run({
        destinationDirectory: path.join(WORKING_DIRECTORY, 'test2'),
        temporaryDirectory: os.tmpdir(),
        repo: path.join(SOURCES, 'base-gameplan')
      })
    ).rejects.toThrow(errors.DirectoryNotEmpty)
  })

  test('fails if options from gameplan module are not valid', async () => {
    await expect(
      run({
        destinationDirectory: path.join(WORKING_DIRECTORY, 'test3'),
        temporaryDirectory: os.tmpdir(),
        repo: path.join(SOURCES, 'invalid-options')
      })
    ).rejects.toThrow(errors.InvalidOptionDefinitions)
  })

  test('fails if gameplan module does not have a run method', async () => {
    await expect(
      run({
        destinationDirectory: path.join(WORKING_DIRECTORY, 'test4'),
        temporaryDirectory: os.tmpdir(),
        repo: path.join(SOURCES, 'no-run')
      })
    ).rejects.toThrow(errors.InvalidRunMethod)
  })

  test('fails if gameplan module attempts to access file outside of directory', async () => {
    await expect(
      run({
        destinationDirectory: path.join(WORKING_DIRECTORY, 'test5'),
        temporaryDirectory: os.tmpdir(),
        repo: path.join(SOURCES, 'out-of-bounds')
      })
    ).rejects.toThrow(errors.OutOfBoundsFile)
  })

  test('fails if variables given for template are not an object', async () => {
    await expect(
      run({
        destinationDirectory: path.join(WORKING_DIRECTORY, 'test6'),
        temporaryDirectory: os.tmpdir(),
        repo: path.join(SOURCES, 'invalid-template-call')
      })
    ).rejects.toThrow('template variables must be an object')
  })

  test('prompts for options', async () => {
    __onPrompt(questions => {
      expect(questions).toMatchSnapshot()
      const byName = questions.reduce((hash, item) => {
        hash[item.name] = item
        return hash
      }, {})
      return {
        directory: byName.directory.default,
        choice: 'foo',
        boolean: true
      }
    })
    await run({
      destinationDirectory: path.join(WORKING_DIRECTORY, 'test7'),
      temporaryDirectory: os.tmpdir(),
      repo: path.join(SOURCES, 'lots-of-options'),
      prompt: true
    })
  })

  test('throws error when spawn throws error', async () => {
    await expect(
      run({
        destinationDirectory: path.join(WORKING_DIRECTORY, 'test8'),
        temporaryDirectory: os.tmpdir(),
        repo: path.join(SOURCES, 'spawn-error')
      })
    ).rejects.toThrow(errors.SpawnError)
    assertDirEqual(
      path.join(WORKING_DIRECTORY, 'test7'),
      path.join(SNAPSHOTS, 'options')
    )
  })

  test('throws error when variable is found that is not handled', async () => {
    await expect(
      run({
        destinationDirectory: path.join(WORKING_DIRECTORY, 'test9'),
        temporaryDirectory: os.tmpdir(),
        repo: path.join(SOURCES, 'template-unknown-variables')
      })
    ).rejects.toThrow(errors.UndefinedTemplateVariable)
  })

  test.todo('parses arguments')
})
