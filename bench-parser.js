var HTTPParser = require('./parser')

var n = 40000
var request = Buffer.from([
  'GET /favicon.ico HTTP/1.1',
  'Host: 0.0.0.0=5000',
  'User-Agent: Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9) ' +
    'Gecko/2008061015 Firefox/3.0',
  'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language: en-us,en;q=0.5',
  'Accept-Encoding: gzip,deflate',
  'Accept-Charset: ISO-8859-1,utf-8;q=0.7,*;q=0.7',
  'Keep-Alive: 300',
  'Connection: keep-alive',
  '', ''
].join('\r\n'))

var noop = function () {}
var res = []
setInterval(function () {
  var before = Date.now()

  for (var parser, i = 0; i < n; i++) {
    parser = new HTTPParser()
    parser[HTTPParser.kOnBody] = parser[HTTPParser.kOnHeadersComplete] = noop
    parser.execute(request)
    // parser.finish()
    // parser.close()
  }

  var now = Date.now()
  var delta = now - before
  var rps = Math.round(n / delta * 1000)
  res.push(rps)
  if (res.length > 10) res.shift()
  var copy = res.slice(0)
  copy.sort(function (a, b) { return a - b })
  var median = copy[copy.length >> 1]
  console.log('median: %s req/second   (now: %s req/second (%s reqs in %s ms))', median, rps, n, delta)
}, 200)
