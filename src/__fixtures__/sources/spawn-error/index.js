'use strict'

exports.run = ({ operations }) => {
  operations.spawn('git', ['foo'])
}
