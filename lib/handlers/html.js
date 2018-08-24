'use strict'

module.exports = html

var u = require('unist-builder')

/* Return either a `raw` node, in dangerous mode, or
 * nothing. */
function html(h, node) {
  var props = { __html: node.value }
  return h.dangerous ? h(node.position, 'raw', props, []) : null
}
