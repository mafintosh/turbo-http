# turbo-http

A low level http library for Node.js based on [turbo-net](https://gitub.com/mafintosh/turbo-http)

```
npm install turbo-http
```

WIP, this module is already *really* fast but there are some HTTP features
missing and easy perf gains to be had :D :D :D

On my laptop I can serve simple hello world payloads at around 100k requests/seconds compared to 10k requests/second using node core.

## Usage

``` js
const turbo = require('turbo-http')

const server = turbo.createServer(function (req, res) {
  res.setStatus(200, 'OK')
  res.setHeader('Content-Length', '11')
  res.write(Buffer.from('hello world'))
})

server.listen(8080)
```

## API

#### `server = turbo.createServer([onrequest])`

Create a new http server. Inherits from [the turbo-net tcp server](https://github.com/mafintosh/turbo-net#server--turbocreateserveroptions-onsocket)

#### `server.on('request', req, res)`

Emitted when a new http request is received.

#### `res.setStatus(code, msg)`

Set the http status

#### `res.setHeader(name, value)`

Set a http header

#### `res.write(buf, [length], [callback])`

Write a buffer. When the callback is called, the buffer
has been *completely* flushed to the underlying socket and is safe to
reuse for other purposes

#### `req.url`

Request url

#### `req.method`

Request method

#### `req.ondata(buffer, start, length)

Called when there is data read. If you use the buffer outside of this function
you should copy it.

#### `req.onend()`

Called when the request is fully read.

## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

## License

MIT
