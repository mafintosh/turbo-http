const turbo = require('turbo-net')
const { HTTPParser } = require('http-parser-js')
const EventEmitter = require('events').EventEmitter

const SEP = ': '
const EOL = '\r\n'

class Client {
  constructor (obj) {
    this._pool = []

    this._host = obj.host || '127.0.0.1'
    this._port = obj.port || 80
    this._path = obj.path || '/'
    this._headers = obj.headers || {}
    this._method = obj.method || 'GET'
    this.socket = null
  }

  _connect (cb) {
    const self = this
    const buf = this._alloc()
    const bus = new EventEmitter()
    const { _host, _port } = self
    const socket = turbo.connect(_port, _host)

    self.socket = socket

    sendrequestline()
    sendhead()

    const parser = new HTTPParser(HTTPParser.RESPONSE)

    parser[HTTPParser.kOnHeadersComplete] = onhead
    parser[HTTPParser.kOnBody] = onbody
    parser[HTTPParser.kOnMessageComplete] = onend

    function onhead () {}

    function onbody (body, start, end) {
      bus.emit('data', body)
    }

    function onend () {
      bus.emit('end', null)
    }

    socket.on('connect', function () {
      socket.read(buf, onread)
      cb(bus)
    })

    function onread (err, buf, read) {
      if (err || !read) return
      parser.execute(buf, 0, read)
      socket.read(buf, onread)
    }

    function sendrequestline () {
      const requestLine = self._method + ' ' + self._path + ' HTTP/1.1' + EOL

      socket.write(Buffer.from(requestLine))
    }

    function sendhead () {
      const headers = self._headers

      if (headers.host) {
        headers['Host'] = headers.host
        delete headers['host']
      } else headers['Host'] = _host + ':' + _port

      let _headersStr = ''
      for (const key in headers) {
        _headersStr += key + SEP + headers[key] + EOL
      }
      _headersStr += EOL

      socket.write(Buffer.from(_headersStr))
    }
  }

  write (messageBody) {
    const buf = Buffer.from(messageBody || '')
    this.socket.write(buf, buf.length)
  }

  end (cb) {
    this.socket.end(cb)
  }

  _alloc () {
    return this._pool.pop() || Buffer.alloc(65536)
  }
}

module.exports = Client
