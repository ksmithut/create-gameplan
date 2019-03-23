'use strict'

exports.options = ({ directory }) => ({
  directory: {
    type: 'string',
    description: 'The directory',
    default: directory
  },
  choice: {
    type: 'string',
    choices: ['foo', 'bar', 'hello'],
    default: 'hello'
  },
  boolean: {
    type: 'boolean',
    description: 'Should be a true or a false',
    prompt: 'Yes or no',
    default: true
  }
})

exports.run = ({ options, operations }) => {
  operations.json(options, 'test.json')
}
