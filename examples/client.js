const turbo = require('../')
const http = require('http')

const querystring = require('querystring')
const postData = querystring.stringify({
  'msg': 'Hello World!'
})

const server = http.createServer(function (request, response) {
  let body = []
  request.on('data', (chunk) => {
    body.push(chunk)
  }).on('end', () => {
    body = Buffer.concat(body).toString()
    console.log(`Server has body: ${body}`)
    response.end(body)
  })
})

server.listen(0, function () {
  const options = {
    hostname: 'localhost',
    port: server.address().port,
    path: '/upload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }

  const req = turbo.request(options, (res) => {
    console.log(`content length of response from server is ${res.getHeader('content-length')}`)
    res.ondata = function (body, start, end) {
      console.log(`data received from server: ${body.slice(start, start+end).toString()}`)
    }

    res.onend = function () {
      req.end()
      server.close()
    }
  })

  const buf = Buffer.from(postData)
  req.write(buf, buf.length)
})
