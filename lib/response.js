const {
  httpStatus,
  httpStatusMessage,
  createHttpStatus
} = require('../http-status')

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

class Response {
  constructor (server, socket, headers) {
    this.server = server
    this.socket = socket
    this.statusCode = 200
    this.statusMessage = undefined
    this.headerSent = false

    this._headers = headers
    this._headersLength = 0
    this._headersMap = new Map()
    this._keepAlive = true
    this._chunked = true
    this._reuseChunkHeader = server._reuseChunkHeader
    this._reuseChunk = server._reuseChunk
  }

  hasHeader (name) {
    return this._headersMap.has(name.toLowerCase())
  }

  getHeader (name) {
    const entry = this._headersMap.get(name.toLowerCase())
    if (!entry) return
    return entry[1]
  }

  getHeaders () {
    const headers = {}
    this._headersMap.forEach(entry => {
      headers[entry[0]] = entry[1]
    })
    return headers
  }

  setHeader (name, value) {
    this._headersMap.set(name.toLowerCase(), [name, value])
    if (CONTENT_LENGTH.test(name)) this._chunked = false
    else if (CONNECTION.test(name)) this._keepAlive = false
  }

  writeHead (statusCode, statusMessage, headers = {}) {
    this.statusCode = statusCode

    if (typeof statusMessage === 'string') {
      this.statusMessage = statusMessage
    } else {
      this.statusMessage = httpStatusMessage[this.statusCode]
      headers = statusMessage
    }

    Object.keys(headers).forEach(name => {
      this.setHeader(name, headers[name])
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

  _renderHeader (name, value) {
    const header = name + SEP + value + EOL

    // slow path but very unlikely (a *lot* of headers)
    if (this._headersLength + header.length > 65534) {
      this._headers = Buffer.concat([this._headers, Buffer.allocUnsafe(65536)])
    }

    this._headers.asciiWrite(header, this._headersLength, header.length)
    this._headersLength += header.length
  }

  _renderHeaders () {
    this._headersMap.forEach(entry => {
      this._renderHeader(entry[0], entry[1])
    })
  }

  _flushHeaders () {
    this._renderHeaders()
    this.headerSent = true
    if (this._keepAlive) this._appendHeader(HEADER_KEEP_ALIVE)
    if (this._chunked) this._appendHeader(HEADER_CHUNKED)
    this._headers.asciiWrite(EOL, this._headersLength)
  }

  _writeHeader (buf, n, cb) {
    this._flushHeaders()

    const status = getStatus(this.statusCode, this.statusMessage)

    this.socket.writev(
      [status, this._headers, buf],
      [status.length, this._headersLength + 2, n],
      cb
    )
  }

  _writeHeaderv (bufs, ns, cb) {
    this._flushHeaders()

    const status = getStatus(this.statusCode, this.statusMessage)

    this.socket.writev(
      [status, this._headers].concat(bufs),
      [status.length, this._headersLength + 2].concat(ns),
      cb
    )
  }

  _writeHeaderChunkedv (bufs, ns, cb) {
    this._flushHeaders()

    const status = getStatus(this.statusCode, this.statusMessage)
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

    const status = getStatus(this.statusCode, this.statusMessage)
    const chunkHeader = this.server._allocSmall()
    const chunkHeaderLength = encodeHex(n, chunkHeader)

    this.socket.writev(
      [status, this._headers, chunkHeader, buf, EOL_BUFFER],
      [status.length, this._headersLength + 2, chunkHeaderLength, n, 2],
      cb || this._reuseChunkHeader
    )
  }

  write (buf, n, cb) {
    if (typeof buf === 'string') buf = Buffer.from(buf)
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
    if (typeof buf === 'string') buf = Buffer.from(buf)
    if (!buf) this._end(EMPTY, 0, undefined)
    else if (typeof buf === 'function') this._end(EMPTY, 0, buf)
    else if (typeof n === 'function') this._end(buf, buf.length, n)
    else this._end(buf, n || buf.length, cb)
  }

  _endv (bufs, ns, cb) {
    if (!this.headerSent) {
      if (this._chunked) {
        this.setHeader('Content-Length', addAll(ns))
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

function getStatus (statusCode, statusMessage) {
  if (statusMessage && httpStatusMessage[statusCode] !== statusMessage) {
    return createHttpStatus(statusCode, statusMessage)
  }
  return httpStatus[statusCode]
}

function encodeHex (n, buf) {
  const hex = n.toString(16)
  buf.asciiWrite(hex, 0)
  buf.asciiWrite('\r\n', hex.length)
  return hex.length + 2
}

function addAll (lens) {
  var sum = 0
  for (var i = 0; i < lens.length; i++) sum += lens[i]
  return sum
}

function getLengths (bufs) {
  var lens = new Array(bufs.length)
  for (var i = 0; i < bufs.length; i++) lens[i] = bufs[i].length
  return lens
}

module.exports = Response
