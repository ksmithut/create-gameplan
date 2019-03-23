'use strict'

const { promisify } = require('util')
const fs = require('fs')
const rimraf = require('rimraf')

const fsAsync = {
  mkdir: promisify(fs.mkdir.bind(fs)),
  readFile: promisify(fs.readFile.bind(fs)),
  copyFile: promisify(fs.copyFile.bind(fs)),
  writeFile: promisify(fs.writeFile.bind(fs)),
  mkdtemp: promisify(fs.mkdtemp.bind(fs)),
  readdir: promisify(fs.readdir.bind(fs)),
  unlink: promisify(fs.unlink.bind(fs)),
  rmdir: promisify(fs.rmdir.bind(fs)),
  rmdirRecursive: promisify(rimraf),
  /**
   * @param {string} directory The directory to check emptiness
   * @return {Promise<boolean>}
   */
  dirIsEmpty: async directory => {
    const files = await fsAsync.readdir(directory)
    return files.length === 0
  }
}

module.exports = fsAsync
