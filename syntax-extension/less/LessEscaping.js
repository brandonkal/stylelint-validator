var tokenize = require('css-tree').tokenize
var TYPE = tokenize.TYPE
var STRING = TYPE.String
var TILDE = '~'.charCodeAt(0)

module.exports = {
  name: 'LessEscaping',
  structure: {
    value: 'String',
  },
  parse: function LessEscaping() {
    var start = this.scanner.tokenStart

    if (!this.scanner.isDelim(TILDE)) {
      this.error('Tilde is expected')
    }

    this.scanner.next()

    return {
      type: 'LessEscaping',
      loc: this.getLocation(start, this.scanner.tokenEnd),
      value: this.consume(STRING),
    }
  },
}
