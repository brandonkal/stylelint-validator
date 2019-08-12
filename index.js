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
        if (decl.root().source.lang === 'object-literal') {
          const t = decl.raws.node.value.type
          if (!(t === 'NumericLiteral' || t === 'StringLiteral')) {
            return
          }
          if (!isNaN(testValue) && t === 'NumericLiteral') testValue += 'px'
        }
        value = csstree.parse(eunits(testValue), {
          context: 'value',
          property: decl.prop,
        })
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

      const match = syntax.matchProperty(decl.prop, value)
      const error = match.error
      if (error) {
        let message = error.rawMessage || error.message || error

        // ignore errors except those which make sense
        if (
          error.name !== 'SyntaxMatchError' &&
          error.name !== 'SyntaxReferenceError'
        ) {
          return
        }

        if (message === 'Mismatch') {
          message = messages.invalid(decl.prop)
        }

        stylelint.utils.report({
          message: message,
          node: decl,
          result: result,
          ruleName: ruleName,
        })
      }
    })
  }
})

module.exports.ruleName = ruleName
module.exports.messages = messages
