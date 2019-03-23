'use strict'

let promptFn

exports.createPromptModule = () => {
  return async questions => {
    if (!promptFn) {
      throw new ReferenceError('Error in tests: No prompt handler found')
    }
    const value = await promptFn(questions)
    exports.__clearOnPrompt()
    return value
  }
}

exports.__onPrompt = fn => {
  if (typeof fn !== 'function') {
    throw new TypeError('Error in tests: __onPrompt requires function')
  }
  promptFn = fn
}

exports.__clearOnPrompt = () => {
  promptFn = null
}
