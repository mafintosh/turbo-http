const turbo = require('turbo-net')
const { HTTPParser } = require('http-parser-js')
const Request = require('./request')
const Response = require('./response')

class Server extends turbo.Server {
  constructor () {
    super()

    this._pool = []
    this._smallPool = []
    this._reuseChunkHeader = (_, bufs) => this._smallPool.push(bufs[2])
    this._reuseChunk = (_, bufs) => this._smallPool.push(bufs[0])

    this.on('connection', this._onhttpconnection)
  }

  _onhttpconnection (socket) {
    const self = this
    const headers = this._alloc() // we are not pipelining (right?) so headers re-use is safe
    const buf = this._alloc()
    const parser = new HTTPParser(HTTPParser.REQUEST)

    var req
    var res

    parser[HTTPParser.kOnHeadersComplete] = onhead
    parser[HTTPParser.kOnBody] = onbody
    parser[HTTPParser.kOnMessageComplete] = onend

    socket.read(buf, onread)
    socket.on('close', onclose)

    function onhead (opts) {
      req = new Request(socket, opts)
      res = new Response(self, socket, headers)
      self.emit('request', req, res)
    }

    function onbody (body, start, end) {
      req.ondata(body, start, end)
    }

    function onend () {
      req.onend()
    }

    function onclose () {
      self._pool.push(headers, buf)
    }

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

module.exports = Server
