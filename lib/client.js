const turbo = require('turbo-net')
const { HTTPParser } = require('http-parser-js')
const Request = require('./outgoing-message')
const Response = require('./incoming-message')

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
    const { _host, _port } = self
    const socket = turbo.connect(_port, _host)
    const req = new Request(self, socket, headers)
    var res

    sendhead()

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

    socket.on('connect', function () {
      socket.read(headers, onread)
    })

    function onread (err, buf, read) {
      if (err || !read) return
      parser.execute(buf, 0, read)
      socket.read(buf, onread)
    }

    const parser = new HTTPParser(HTTPParser.RESPONSE)

    parser[HTTPParser.kOnHeadersComplete] = onhead
    parser[HTTPParser.kOnBody] = onbody
    parser[HTTPParser.kOnMessageComplete] = onend

    function onhead (opts) {
      res = new Response(socket, opts)
      cb(res)
    }

    function onbody (body, start, end) {
      res.ondata(body, start, end)
    }

    function onend () {
      res.onend()
    }

    return req
  }

  _alloc () {
    return this._pool.pop() || Buffer.allocUnsafe(65536)
  }

  _allocSmall () {
    return this._smallPool.pop() || Buffer.allocUnsafe(32)
  }
}

module.exports = Client
