const rayo = require('rayo')
const { createServer } = require('../../index')

rayo({ server: createServer(), port: 5050 })
  .get('/', (req, res) => res.end('Thunderstruck..!'))
  .start()
