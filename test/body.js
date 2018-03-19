const tape = require('tape')
const turbo = require('../')
const http = require('http')

tape('test http head response response has no body', function (t) {
  const server = turbo.createServer(function (req, res) {
    res.setHeader('Status', 200)
    res.write('FAIL')
  })

  server.listen(0, function () {
    const req = http.request({
      port: server.address().port,
      method: 'HEAD',
      path: '/'
    }, function (res) {
      res.on('end', function () {
        server.close()
      })
      res.resume()
    })
    req.on('error', function (e) {
      t.pass('should throw parse error.')
      t.end()
    })
    req.end()
  })
})

tape('test http head response when req has no body', function (t) {
  const server = turbo.createServer(function (req, res) {
    res.setHeader('Status', 200)
    res.write('')
  })

  server.listen(0, function () {
    const req = http.request({
      port: server.address().port,
      method: 'HEAD',
      path: '/'
    }, function (res) {
      res.on('end', function () {
        server.close()
      })
      req.on('error', function (e) {
        t.pass('should throw parse error.')
        t.end()
      })
      res.resume()
    })
    req.end()
  })
})
