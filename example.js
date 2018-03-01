const turbo = require('./')

const reply = Buffer.from(`
HTTP/1.1 200 OK
Content-Length: 11
Connection: keep-alive

hello world
`.trim().replace(/\r?\n/g, '\r\n'))

const hello = Buffer.from('hello world')
var headers = null

turbo.createServer(function (req, res) {
  req.onend = function () {
    res.setStatus(200, 'OK')
    res.setHeader('Content-Length', '11')
    res.write(hello)
  }
}).listen(8080)
