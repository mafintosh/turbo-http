const polka = require('polka')

polka()
  .get('/', (req, res) => res.end('Thunderstruck..!'))
  .listen(5050)
