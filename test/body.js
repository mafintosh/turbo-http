const tape = require('tape')
const turbo = require('../')
const http = require('http')
const net = require('net')

tape('test http head response response has no body', function (t) {
  const server = turbo.createServer(function (req, res) {
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

tape('test that no empty chunk is sent when the user explicitly sets a Transfer-Encoding header', function (t) {
  const UTF8_STRING = '南越国是前203年至前111年存在于岭南地区的一个国家，' +
                    '国都位于番禺，疆域包括今天中国的广东、广西两省区的大部份地区，福建省、湖南、' +
                    '贵州、云南的一小部份地区和越南的北部。南越国是秦朝灭亡后，' +
                    '由南海郡尉赵佗于前203年起兵兼并桂林郡和象郡后建立。前196年和前179年，' +
                    '南越国曾先后两次名义上臣属于西汉，成为西汉的“外臣”。前112年，' +
                    '南越国末代君主赵建德与西汉发生战争，被汉武帝于前111年所灭。' +
                    '南越国共存在93年，历经五代君主。南越国是岭南地区的第一个有记载的政权国家，' +
                    '采用封建制和郡县制并存的制度，它的建立保证了秦末乱世岭南地区社会秩序的稳定，' +
                    '有效的改善了岭南地区落后的政治、经济现状。'

  const server = turbo.createServer(function (req, res) {
    res.write(UTF8_STRING)
    res.end()
  })

  server.listen(0, function () {
    const client = net.createConnection(server.address().port)

    client.on('connect', function () {
      client.write('GET / HTTP/1.1\r\n\r\n')
      client.setEncoding('utf8')
      client.end()
    })

    let resp = ''
    client.on('data', function (data) {
      resp += data
    })

    client.on('end', function () {
      // Make sure this doesn't end with 0\r\n\r\n
      t.ok(/^0\r\n$/m.test(resp))
    })

    client.on('close', function () {
      server.close()
      t.end()
    })
  })
})
