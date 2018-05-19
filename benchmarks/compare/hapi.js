const Hapi = require('hapi')

const server = Hapi.server({ port: 5050, debug: false })
server.route({
  method: 'GET',
  path: '/',
  config: {
    cache: false,
    response: { ranges: false },
    state: { parse: false }
  },
  handler () {
    return 'Thunderstruck..!'
  }
})

server.start()
