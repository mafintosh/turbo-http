const TurboServer = require('turbo-net/lib/server')
const { HTTPParser } = require('http-parser-js')

class Request {
  constructor (socket, opts) {
    this.method = HTTPParser.methods[opts.method]
    this.url = opts.url
    this.socket = socket
    this.options = opts
    this.ondata = noop
    this.onend = noop
  }
}

class Response {
  constructor (socket) {
    this.socket = socket
    this.headers = Buffer.allocUnsafe(1024)
    this.headersLength = 0
  }

  setStatus (status, msg) {
    const head = 'HTTP/1.1 ' + status + ' ' + msg + '\r\n'
    this.headers.write(head, this.headersLength, head.length)
    this.headersLength += head.length
  }

  setHeader (name, value) {
    const header = name + ': ' + value + '\r\n'
    this.headers.write(header, this.headersLength, header.length)
    this.headersLength += header.length
  }

  write (buf, n, cb) {
    if (typeof n === 'function') return this.write(buf, buf.length, n)
    if (!n) n = buf.length

    if (this.headers) {
      if (n < buf.length) buf = buf.slice(0, n)
      this.headers.write('\r\n', this.headersLength, 2)
      this.headersLength += 2
      buf = Buffer.concat([this.headers.slice(0, this.headersLength), buf])
      this.headers = null
      n = buf.length
    }

    this.socket.write(buf, n, cb)
  }
}

class Server extends TurboServer {
  constructor () {
    super()
    
    const self = this
    this.on('connection', onconnection)

    function onconnection (socket) {
      const buf = Buffer.alloc(65536)
      const parser = new HTTPParser(HTTPParser.REQUEST)
      var req
      var res

      parser[HTTPParser.kOnHeadersComplete] = onhead
      parser[HTTPParser.kOnBody] = onbody
      parser[HTTPParser.kOnMessageComplete] = onend

      socket.read(buf, onread)

      function onhead (opts) {
        req = new Request(socket, opts)
        res = new Response(socket)
        self.emit('request', req, res)
      }

      function onbody (body, start, end) {
        req.ondata(body, start, end)
      }

      function onend () {
        req.onend()
      }

      function onread (err, buf, read) {
        if (err || !read) return
        parser.execute(buf, 0, read)
        socket.read(buf, onread)
      }
    }
  }
}

exports.createServer = function (opts, onrequest) {
  if (typeof opts === 'function') return exports.createServer(null, opts)
  if (!opts) opts = {}

  const server = new Server(opts)
  if (onrequest) server.on('request', onrequest)
  return server
}

function noop () {}
