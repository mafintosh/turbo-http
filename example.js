const turbo = require('./')

const hello = Buffer.from('hello world\n')

turbo.createServer(function (req, res) {
  res.setHeader('Content-Length', hello.length)
  res.write(hello)
}).listen(8080)
