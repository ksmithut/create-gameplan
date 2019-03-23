'use strict'

const objectMap = (obj, mapper) => {
  return Object.entries(obj).reduce((newObj, [key, value]) => {
    newObj[key] = mapper(value, key, obj)
    return newObj
  }, {})
}

module.exports = objectMap
