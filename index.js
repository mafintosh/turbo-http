const Server = require('./lib/server')
const Client = require('./lib/client')

exports.createServer = function (opts, onrequest) {
  if (typeof opts === 'function') return exports.createServer(null, opts)
  if (!opts) opts = {}

  const server = new Server(opts)
  if (onrequest) server.on('request', onrequest)
  return server
}

exports.request = function (obj, cb) {
  if (typeof obj !== 'object') return exports.request({
    host: obj
  }, cb)

  const client = new Client(obj)
  client._connect(cb)
  return client
}
