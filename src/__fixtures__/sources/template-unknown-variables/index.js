'use strict'

exports.run = ({ operations }) => {
  operations.template(['template.txt'], ['template.txt'], {})
}
