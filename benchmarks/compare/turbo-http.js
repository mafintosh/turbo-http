const Server = require('../../lib/server')

const server = new Server()
const thunderstruck = Buffer.from('Thunderstruck..!')
server
  .on('request', (req, res) => res.end(thunderstruck))
  .listen(5050)
