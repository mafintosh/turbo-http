const tape = require('tape')
const turbo = require('../')
const net = require('net')

const hello = Buffer.from('hello world\n')

tape('test headers with bad ending', function (t) {
  const server = turbo.createServer(function (req, res) {
    res.setHeader('Content-Length', hello.length)
    res.write(hello)
  })

  server.listen(0, function () {
    const client = net.createConnection(server.address().port)

    client.on('connect', function () {
      client.write('GET /blah HTTP/1.1\r\n' +
        'Host: woot.example.com:443\r' +
        'Cookie:\r\n' +
        'Content-Type: woot\r\nContent-Type: ppek\r\nContent-Type: woot\r\n' +
        '\r\n\r\nhello world\r\n'
      )
      client.end()
    })

    client.on('data', function () {
      t.fail('should not receive reply from server.')
    })

    client.on('close', function () {
      server.close()
      t.pass('drops request successfully when header have bad ending.')
      t.end()
    })
  })
})

tape('test headers with missing its key', function (t) {
  const server = turbo.createServer(function (req, res) {
    t.same(req._options.headers, [ 'Content-Type',
      'woot',
      'Content-Type',
      'ppek',
      'Content-Type',
      'woot' ])
    t.end()
  })

  server.listen(0, function () {
    const client = net.createConnection(server.address().port)

    client.on('connect', function () {
      client.write('GET /blah HTTP/1.1\r\n' +
        'Host woot.example.com:443\r\n' +
        ':value\r\n' +
        'Content-Type: woot\r\nContent-Type: ppek\r\nContent-Type: woot\r\n' +
        '\r\n\r\nhello world\r\n'
      )
      client.end()
    })

    client.on('close', function () {
      server.close()
    })
  })
})

tape('test headers with emoji unicode key', function (t) {
  const server = turbo.createServer(function (req, res) {
    res.setHeader('Content-Length', hello.length)
    res.write(hello)
  })

  server.listen(0, function () {
    const client = net.createConnection(server.address().port)

    client.on('connect', function () {
      client.write('GET /blah HTTP/1.1\r\n' +
        'Host woot.example.com:443\r\n' +
        '👍:value\r\n' +
        'Content-Type: woot\r\nContent-Type: ppek\r\nContent-Type: woot\r\n' +
        '\r\n\r\nhello world\r\n'
      )
      client.end()
    })

    client.on('data', function () {
      t.fail('should remove emoji unicode key from headers.')
    })

    client.on('close', function () {
      server.close()
      t.pass('drops request with emoji unicode in header.')
      t.end()
    })
  })
})
