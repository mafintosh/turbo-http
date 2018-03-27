const turbo = require('../')
const http = require('http')

const querystring = require('querystring')
const postData = querystring.stringify({
  'msg': 'Hello World!'
});

const server = http.createServer(function (request, response) {

  let body = [];
  request.on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    console.log(`Server has body: ${body}`)
    response.end(body);
  });
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
  };

  const req = turbo.request(options, (res) => {
    res.on('data', (chunk) => {
      console.log(`Client has response: ${chunk.toString()}`);
    });
    res.on('end', () => {
      console.log('No more data in response.');
      req.end()
      server.close()
    });
  });

  req.write(postData);
})
