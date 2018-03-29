const turbo = require('turbo-net')
const { HTTPParser } = require('http-parser-js')
const EventEmitter = require('events').EventEmitter
const Request = require('./response')

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
    this._reuseChunkHeader = (_, bufs) => this._smallPool.push(bufs[2])
    this._reuseChunk = (_, bufs) => this._smallPool.push(bufs[0])
  }

  _connect (cb) {
    const self = this
    const headers = this._alloc()
    const bus = new EventEmitter()
    const { _host, _port } = self
    const socket = turbo.connect(_port, _host)
    const req = new Request(self, socket, headers)

    sendhead()
    return req

    function sendhead () {
      const headers = self._headers

      if (headers.host) {
        headers['Host'] = headers.host
        delete headers['host']
      } else headers['Host'] = _host + ':' + _port

      for (const key in headers) {
        req.setHeader(key, headers[key])
      }
    }

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
  }

  _alloc () {
    return this._pool.pop() || Buffer.allocUnsafe(65536)
  }

  _allocSmall () {
    return this._smallPool.pop() || Buffer.allocUnsafe(32)
  }
}

module.exports = Client
