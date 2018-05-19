const http = require('http')

http
  .createServer()
  .listen(5050)
  .on('request', (req, res) => res.end('Thunderstruck..!'))
