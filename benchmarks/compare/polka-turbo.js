const polka = require('polka')
const { createServer } = require('../../index')

polka({ server: createServer() })
  .get('/', (req, res) => res.end('Thunderstruck..!'))
  .listen(5050)
