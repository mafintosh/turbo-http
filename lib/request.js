const { HTTPParser } = require('http-parser-js')

class Request {
  constructor (socket, opts) {
    this.method = HTTPParser.methods[opts.method]
    this.url = opts.url
    this.socket = socket

    this._options = opts
    this._headers = null

    this.ondata = noop
    this.onend = noop
  }

  get headers () {
    return this.getAllHeaders()
  }

  getAllHeaders () {
    if (!this._headers) this._headers = indexHeaders(this._options.headers)
    return this._headers
  }

  getHeader (name) {
    return this.getAllHeaders()[name.toLowerCase()]
  }
}

function noop () {}

function indexHeaders (headers) {
  const map = {}
  for (var i = 0; i < headers.length; i += 2) { map[headers[i].toLowerCase()] = headers[i + 1] }
  return map
}

module.exports = Request
