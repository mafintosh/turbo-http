// https://github.com/jkyberneees/ana/blob/master/libs/turbo-http.js

const util = require('util')
const EventEmitter = require('events')
const turbo = require('../../index')

const Response = require('../../lib/response')
util.inherits(Response, EventEmitter)

const server = turbo.createServer()

server.on('request', (req, res) => {
  setImmediate(() => {
    if (!req.headers) {
      const headers = req.getAllHeaders()
      if (headers instanceof Map) {
        req.headers = {}
        headers.forEach((v, k) => (req.headers[k] = v))
      } else {
        req.headers = headers
      }
    }
  })
})

const service = require('restana')({ server })

service.get('/', (req, res) => res.send('Thunderstruck..!'))

service.start(5050)
