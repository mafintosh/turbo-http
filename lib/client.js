const turbo = require('turbo-net')
const { HTTPParser } = require('http-parser-js')
const Request = require('./request')

const SEP = ': '
const EOL = '\r\n'
const LAST_CHUNK = Buffer.from('0\r\n\r\n')
const LAST_CHUNK_AFTER_DATA = Buffer.from('\r\n0\r\n\r\n')

class Client {
  constructor (obj) {

    this._host = obj.host || '127.0.0.1'
    this._port = obj.port || 80
    this._path = obj.path || '/'
    this._headers = obj.headers || {}
    this._method = obj.method || 'GET' 
  }

  _connect () {
    const self = this
    const { _host, _port } = self
    const socket = turbo.connect(_port, _host)

    sendrequestline()
    sendhead()

    return socket

    function sendrequestline () {
      const requestLine = self._method + " " + self._path + " HTTP/1.1" + EOL

      socket.write(Buffer.from(requestLine))
    }

    function sendhead () {
      const headers = self._headers

      if (headers.host) {
        headers['Host'] = headers.host
        delete headers['host']
      } else headers['Host'] = _host + ":" + _port

      let _headersStr = ''
      for (const key in headers) {
        _headersStr += key + SEP + headers[key]  + EOL
      }
      _headersStr += EOL

      socket.write(Buffer.from(_headersStr))
    }
  }
}

module.exports = Client
