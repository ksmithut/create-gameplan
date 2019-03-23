'use strict'

exports.run = ({ operations }) => {
  operations.template(['foo'], ['foo'], null)
}
