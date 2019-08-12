var tokenize = require('css-tree').tokenize
var TYPE = tokenize.TYPE
var ATRULE = TYPE.Atrule
var AT = '@'.charCodeAt(0)

module.exports = {
  name: 'LessVariableReference',
  structure: {
    name: 'Identifier',
  },
  parse: function LessVariableReference() {
    var start = this.scanner.tokenStart

    if (!this.scanner.isDelim(AT)) {
      this.error()
    }

    this.scanner.next()
    this.eat(ATRULE)

    return {
      type: 'LessVariableReference',
      loc: this.getLocation(start, this.scanner.tokenEnd),
      name: this.scanner.substrToCursor(start + 2),
    }
  },
}
