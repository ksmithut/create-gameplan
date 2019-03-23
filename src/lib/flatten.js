'use strict'

const flatten = value =>
  Array.isArray(value)
    ? value.reduce((array, item) => array.concat(flatten(item)), [])
    : [value]

module.exports = flatten
