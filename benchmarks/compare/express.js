const express = require('express')

express()
  .disable('etag')
  .disable('x-powered-by')
  .get('/', (req, res) => res.end('Thunderstruck..!'))
  .listen(5050)
