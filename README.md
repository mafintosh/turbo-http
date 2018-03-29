# turbo-http

A low level http library for Node.js based on [turbo-net](https://github.com/mafintosh/turbo-net)

```
npm install turbo-http
```

[![build status](https://travis-ci.org/mafintosh/turbo-http.svg?branch=master)](https://travis-ci.org/mafintosh/turbo-http)

WIP, this module is already *really* fast but there are some HTTP features
missing and easy perf gains to be had :D :D :D

On my laptop I can serve simple hello world payloads at around 100k requests/seconds compared to 10k requests/second using node core.

## Usage

server:
``` js
const turbo = require('turbo-http')

const server = turbo.createServer(function (req, res) {
  res.setHeader('Content-Length', '11')
  res.write(Buffer.from('hello world'))
})

server.listen(8080)
```

client:
```js
const turbo = require('turbo-http')

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
    console.log(`data received from server: ${body.slice(start, start + end).toString()}`)
  }

  res.onend = function () {
    req.end()
  }
})
```

## API

#### `server = turbo.createServer([onrequest])`

Create a new http server. Inherits from [the turbo-net tcp server](https://github.com/mafintosh/turbo-net#server--turbocreateserveroptions-onsocket)

#### `server.on('request', req, res)`

Emitted when a new http request is received.

#### `res.statusCode = code`

Set the http status

#### `res.setHeader(name, value)`

Set a http header

#### `res.write(buf, [length], [callback])`

Write a buffer. When the callback is called, the buffer
has been *completely* flushed to the underlying socket and is safe to
reuse for other purposes

#### `res.writev(buffers, [lengths], [callback])`

Write more that one buffer at once.

#### `res.end([buf], [length], [callback]`)

End the request. Only needed if you do not provide a `Content-Length`.

#### `req.url`

Request url

#### `req.method`

Request method

#### `req.socket`

Request [turbo-net](https://github.com/mafintosh/turbo-net) socket

#### `value = req.getHeader(name)`

Get a request header.

#### `headers = req.getAllHeaders()`

Get all request headers as a map.

#### `req.ondata(buffer, start, length)`

Called when there is data read. If you use the buffer outside of this function
you should copy it.

#### `req.onend()`

Called when the request is fully read.

#### `client = turbo.request(opts, [onresponse])`

Create a new http client to make HTTP requests. Inherits from [the turbo-net tcp connection](https://github.com/mafintosh/turbo-net#connection--turboconnectport-host-options)

## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

## License

MIT
