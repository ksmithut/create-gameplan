'use strict'

const { spawn } = require('child_process')

class SpawnError extends Error {
  constructor (command, args, options, code, stdout, stderr) {
    const fullCommand = [command, ...args].join(' ')
    super(`"${fullCommand}" exited with code ${code}`)
    Error.captureStackTrace(this, this.constructor)
    this.code = 'SPAWN_ERROR'
    this.details = {
      command,
      args,
      options,
      code,
      stdout,
      stderr
    }
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions} [options]
 */
const spawnAsync = async (command, args, options) => {
  return new Promise((resolve, reject) => {
    const stdout = []
    const stderr = []
    const spawnedProcess = spawn(command, args, options)
      .on('error', err => reject(err))
      .on('close', code => {
        const stdoutBuffer = Buffer.concat(stdout)
        const stderrBuffer = Buffer.concat(stderr)
        code === 0
          ? resolve({ stdout: stdoutBuffer, stderr: stderrBuffer })
          : reject(new SpawnError(command, args, options, code, stdout, stderr))
      })
    if (spawnedProcess.stdout) {
      spawnedProcess.stdout.on('data', chunk => stdout.push(chunk))
    }
    if (spawnedProcess.stderr) {
      spawnedProcess.stderr.on('data', chunk => stderr.push(chunk))
    }
  })
}

exports.spawnAsync = spawnAsync
exports.SpawnError = SpawnError
