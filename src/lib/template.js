'use strict'

class UndefinedTemplateVariable extends Error {
  constructor (variableName) {
    super(`"${variableName}" found in template, but not provided in variables`)
    Error.captureStackTrace(this, this.constructor)
    this.code = 'UNDEFINED_TEMPLATE_VARIABLE'
  }
}

const template = (contents, variables) => {
  return contents.replace(/{{([^}]+)}}/g, (substring, variableName) => {
    if (typeof variables[variableName] === 'undefined') {
      throw new UndefinedTemplateVariable(variableName)
    }
    return variables[variableName]
  })
}

exports.template = template
exports.UndefinedTemplateVariable = UndefinedTemplateVariable
