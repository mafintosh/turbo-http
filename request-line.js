const EOL = '\r\n'

module.exports = (method, path) => Buffer.from(method + ' ' + path + ' HTTP/1.1' + EOL)
