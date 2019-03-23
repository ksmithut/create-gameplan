'use strict'

exports.run = ({ operations }) => {
  operations.copy(['/etc', 'passwd'], ['passwd'])
}
