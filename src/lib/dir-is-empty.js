'use strict'

const fs = require('fs')
const { promisify } = require('util')

const readdirAsync = promisify(fs.readdir.bind(fs))

exports.dirIsEmpty = async directory => {
  const files = await readdirAsync(directory)
  return files.length === 0
}
