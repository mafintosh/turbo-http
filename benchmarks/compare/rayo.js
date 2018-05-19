const rayo = require('rayo')

rayo({ port: 5050 })
  .get('/', (req, res) => res.end('Thunderstruck..!'))
  .start()
