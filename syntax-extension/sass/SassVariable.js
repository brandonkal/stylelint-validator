var tokenize = require('css-tree').tokenize
var IDENT = tokenize.TYPE.Ident
var DOLLARSIGN = '$'.charCodeAt(0)

module.exports = {
  name: 'SassVariable',
  structure: {
    name: 'Identifier',
  },
  parse: function SassVariable() {
    var start = this.scanner.tokenStart

    if (!this.scanner.isDelim(DOLLARSIGN)) {
      this.error()
    }

    this.scanner.next()

    return {
      type: 'SassVariable',
      loc: this.getLocation(start, this.scanner.tokenEnd),
      name: this.consume(IDENT),
    }
  },
}
