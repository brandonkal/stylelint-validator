const stylelint = require('stylelint')
const csstree = require('css-tree').fork(require('./syntax-extension'))
const syntax = csstree.lexer

const ruleName = 'csstree/validator'
const messages = stylelint.utils.ruleMessages(ruleName, {
  parseError: function(value) {
    return 'Can\'t parse value "' + value + '"'
  },
  invalid: function(property) {
    return 'Invalid value for `' + property + '`'
  },
})

function eunits(value) {
  return value.replace(/(\d+)(emin|emax|eh|ew)\b/g, (_, num, unit) => {
    return `calc(${num} * var(--${unit}))`
  })
}

function parse(property, value) {
  return csstree.parse(eunits(value), {
    context: 'value',
    property,
  })
}

function shouldReturn(error) {
  return (
    !error ||
    (error.name !== 'SyntaxMatchError' && error.name !== 'SyntaxReferenceError')
  )
}

module.exports = stylelint.createPlugin(ruleName, function(options) {
  let ignore = false
  options = options || {}

  if (Array.isArray(options.ignore)) {
    ignore = options.ignore.reduce(function(res, name) {
      res[name] = true
      return res
    }, Object.create(null))
  }

  return function(root, result) {
    root.walkDecls(function(decl) {
      let value
      let valueWithPX

      // ignore properties from ignore list
      if (ignore && ignore[decl.prop.toLowerCase()]) {
        return
      }

      // ignore properocessor's var declarations (since postcss treats it as declarations)
      // and declarations with property names that contain interpolation
      if (/[#$@]/.test(decl.prop)) {
        return
      }
      // ignore values with interpolations. These are tested with csstyper.
      if (/\${/.test(decl.value)) {
        return
      }

      try {
        // Object styles with numerical literal values need to be replaced with px
        let testValue = decl.value
        let addPX = false
        if (decl.root().source.lang === 'object-literal') {
          const t = decl.raws.node.value.type
          // Don't attempt to validate complex nodes i.e. terenary.
          if (!(t === 'NumericLiteral' || t === 'StringLiteral')) {
            return
          }
          addPX = !isNaN(testValue) && t === 'NumericLiteral'
        }
        value = parse(decl.prop, value)
        if (addPX) {
          valueWithPX = parse(decl.prop, (testValue += 'px'))
        }
      } catch (e) {
        // ignore values with preprocessor's extensions
        if (e.type === 'PreprocessorExtensionError') {
          return
        }

        return stylelint.utils.report({
          message: messages.parseError(decl.value),
          node: decl,
          result: result,
          ruleName: ruleName,
        })
      }

      let match = syntax.matchProperty(decl.prop, value)
      let error = match.error

      if (shouldReturn(error)) return

      let message = error.rawMessage || error.message || error

      if (message === 'Mismatch') {
        if (valueWithPX) {
          // Test again with 'px' appended to the input number
          let matchPX = syntax.matchProperty(decl.prop, valueWithPX)
          let errorPX = matchPX.error
          if (shouldReturn(errorPX)) return

          message = errorPX.rawMessage || errorPX.message || errorPX
          if (message === 'Mismatch') {
            message = messages.invalid(decl.prop)
          }
        } else {
          message = messages.invalid(decl.prop)
        }
      }

      stylelint.utils.report({
        message: message,
        node: decl,
        result: result,
        ruleName: ruleName,
      })
    })
  }
})

module.exports.ruleName = ruleName
module.exports.messages = messages
