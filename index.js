const turbo = require('turbo-net')
const httpStatus = require('./http-status')
const { HTTPParser } = require('http-parser-js')

const SEP = ': '
const EOL = '\r\n'
const EOL_BUFFER = Buffer.from(EOL)
const EMPTY = Buffer.alloc(0)
const LAST_CHUNK = Buffer.from('0\r\n\r\n')
const LAST_CHUNK_AFTER_DATA = Buffer.from('\r\n0\r\n\r\n')
const HEADER_CHUNKED = Buffer.from('Transfer-Encoding: chunked\r\n')
const HEADER_KEEP_ALIVE = Buffer.from('Connection: keep-alive\r\n')
const CONTENT_LENGTH = /^Content-Length$/i
const CONNECTION = /^Connection$/i

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

  getAllHeaders () {
    if (!this._headers) this._headers = indexHeaders(this._options.headers)
    return this._headers
  }

  getHeader (name) {
    return this._headers && this._headers.get(name) || this.getAllHeaders().get(name)
  }
}

class Response {
  constructor (server, socket, headers) {
    this.socket = socket
    this.statusCode = 200
    this.headerSent = false

    this._headers = headers
    this._headersLength = 0
    this._keepAlive = true
    this._chunked = true
    this._reuseChunkHeader = server._reuseChunkHeader
    this._reuseChunk = server._reuseChunk
  }

  setHeader (name, value) {
    const header = name + SEP + value + EOL

    // slow path but very unlikely (a *lot* of headers)
    if (this._headersLength + header.length > 65534) {
      this._headers = Buffer.concat([this._headers, Buffer.allocUnsafe(65536)])
    }

    this._headers.asciiWrite(header, this._headersLength, header.length)
    this._headersLength += header.length

    if (CONTENT_LENGTH.test(name)) this._chunked = false
    else if (CONNECTION.test(name)) this._keepAlive = false
  }

  setHeaders (obj) {
    Object.keys(obj).map(key => {
      this.setHeader(key, obj[key])
    })
  }

  _appendHeader (buf) {
    // slow path but very unlikely (a *lot* of headers)
    if (this._headersLength + buf.length > 65534) {
      this._headers = Buffer.concat([this._headers, Buffer.allocUnsafe(65536)])
    }

    buf.copy(this._headers, this._headersLength)
    this._headersLength += buf.length
  }

  _flushHeaders () {
    this.headerSent = true
    if (this._keepAlive) this._appendHeader(HEADER_KEEP_ALIVE)
    if (this._chunked) this._appendHeader(HEADER_CHUNKED)
    this._headers.asciiWrite(EOL, this._headersLength)
  }

  _writeHeader (buf, n, cb) {
    this._flushHeaders()

    const status = httpStatus[this.statusCode]

    this.socket.writev(
      [status, this._headers, buf],
      [status.length, this._headersLength + 2, n],
      cb
    )
  }

  _writeHeaderv (bufs, ns, cb) {
    this._flushHeaders()

    const status = httpStatus[this.statusCode]

    this.socket.writev(
      [status, this._headers].concat(bufs),
      [status.length, this._headersLength + 2].concat(ns),
      cb
    )
  }

  _writeHeaderChunkedv (bufs, ns, cb) {
    this._flushHeaders()

    const status = httpStatus[this.statusCode]
    const chunkHeader = this.server._allocSmall()
    const chunkHeaderLength = encodeHex(addAll(ns), chunkHeader)

    this.socket.writev(
      [status, this._headers, chunkHeader].concat(bufs, EOL_BUFFER),
      [status.length, this._headersLength + 2, chunkHeaderLength].concat(ns, 2),
      cb || this._reuseChunkHeader
    )
  }

  _writeHeaderChunked (buf, n, cb) {
    this._flushHeaders()

    const status = httpStatus[this.statusCode]
    const chunkHeader = this.server._allocSmall()
    const chunkHeaderLength = encodeHex(n, chunkHeader)

    this.socket.writev(
      [status, this._headers, chunkHeader, buf, EOL_BUFFER],
      [status.length, this._headersLength + 2, chunkHeaderLength, n, 2],
      cb || this._reuseChunkHeader
    )
  }

  write (buf, n, cb) {
    if (typeof n === 'function') this._write(buf, buf.length, n)
    else this._write(buf, n || buf.length, cb)
  }

  writev (bufs, ns, cb) {
    if (typeof ns === 'function') this._writev(bufs, getLengths(bufs), ns)
    else this._writev(bufs, ns || getLengths(bufs), cb)
  }

  _writev (bufs, ns, cb) {
    if (this._chunked) {
      if (this.headerSent) this._writeChunkv(bufs, ns, cb)
      else this._writeHeaderChunkedv(bufs, ns, cb)
    } else {
      if (this.headerSent) this.socket.writev(bufs, ns, cb)
      else this._writeHeaderv(bufs, ns, cb)
    }
  }

  _write (buf, n, cb) {
    if (this._chunked) {
      if (this.headerSent) this._writeChunk(buf, n, cb)
      else this._writeHeaderChunked(buf, n, cb)
    } else {
      if (this.headerSent) this.socket.write(buf, n, cb)
      else this._writeHeader(buf, n, cb)
    }
  }

  _writeChunk (buf, n, cb) {
    const header = this.server._allocSmall()
    const headerLength = encodeHex(n, header)

    this.socket.writev(
      [header, buf, EOL_BUFFER],
      [headerLength, n, 2],
      cb || this._reuseChunk
    )
  }

  _writeChunkv (bufs, ns, cb) {
    const header = this.server._allocSmall()
    const headerLength = encodeHex(addAll(ns), header)

    this.socket.writev(
      [header].concat(bufs, EOL_BUFFER),
      [headerLength].concat(ns, 2),
      cb
    )
  }

  endv (bufs, ns, cb) {
    if (typeof ns === 'function') this._endv(bufs, getLengths(bufs), ns)
    else this._endv(bufs, ns || getLengths(bufs), cb)
  }

  end (buf, n, cb) {
    if (!buf) this._end(EMPTY, 0, undefined)
    else if (typeof buf === 'function') this._end(EMPTY, 0, buf)
    else if (typeof n === 'function') this._end(buf, buf.length, n)
    else this._end(buf, n || buf.length, cb)
  }

  _endv (bufs, ns, cb) {
    if (!this.headerSent) {
      if (this._chunked) {
        this.setHeader('Content-Length', addAll(ns))
        this._chunked = false
      }
      this._writeHeaderv(bufs, ns, cb)
      return
    }

    if (this._chunked) {
      const header = this.server._allocSmall()
      const headerLength = encodeHex(addAll(ns), header)
      this.socket.writev(
        [header].concat(bufs, LAST_CHUNK_AFTER_DATA),
        [headerLength].concat(ns, LAST_CHUNK_AFTER_DATA.length),
        cb
      )
      return
    }

    this.socket.writev(bufs, ns, cb)
  }

  _end (buf, n, cb) {
    if (!this.headerSent) {
      if (this._chunked) {
        this.setHeader('Content-Length', n)
        this._chunked = false
      }
      this._writeHeader(buf, n, cb)
      return
    }

    if (this._chunked) {
      if (n) {
        const header = this.server._allocSmall()
        const headerLength = encodeHex(n, header)
        this.socket.writev(
          [header, buf, LAST_CHUNK_AFTER_DATA],
          [headerLength, n, LAST_CHUNK_AFTER_DATA.length],
          cb
        )
        return
      }

      this.socket.write(LAST_CHUNK, LAST_CHUNK.length, cb)
      return
    }

    if (cb || n) this.socket.write(buf, n, cb)
  }
}

function encodeHex (n, buf) {
  const hex = n.toString(16)
  buf.asciiWrite(hex, 0)
  buf.asciiWrite('\r\n', hex.length)
  return hex.length + 2
}

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

exports.createServer = function (opts, onrequest) {
  if (typeof opts === 'function') return exports.createServer(null, opts)
  if (!opts) opts = {}

  const server = new Server(opts)
  if (onrequest) server.on('request', onrequest)
  return server
}

function noop () {}

function addAll (lens) {
  var sum = 0
  for (var i = 0; i < lens.length; i++) sum += lens[i]
  return sum
}

function indexHeaders (headers) {
  const map = new Map()
  for (var i = 0; i < headers.length; i += 2) map.set(headers[i], headers[i + 1])
  return map
}

function getLengths (bufs) {
  var lens = new Array(bufs.length)
  for (var i = 0; i < bufs.length; i++) lens[i] = bufs[i].length
  return lens
}
