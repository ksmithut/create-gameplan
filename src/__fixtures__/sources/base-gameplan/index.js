'use strict'

const path = require('path')

exports.options = ({ directory }) => ({
  name: {
    type: 'string',
    default: path.basename(directory)
  }
})

exports.run = ({ options, operations }) => {
  operations.template('test.template.txt', ['foo', 'testfile.txt'], {
    name: options.name
  })
  operations.copy(['src', 'index.js'], ['src', 'index.js'])
  operations.json(
    {
      name: options.name,
      main: 'src/index.js'
    },
    'package.json'
  )
  operations.spawn('node', '-e', '"console.log(\'hello\')"')
}
