const codeLookup = [
  '\0', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  ' ', '!', '"', '#', '$', '%', '&', '\'',
  '', '', '*', '+', ',', '-', '.', '/',
  '0', '1', '2', '3', '4', '5', '6', '7',
  '8', '9', ':', ';', '<', '=', '>', '?',
  '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G',
  'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W',
  'X', 'Y', 'Z', '[', '\\', ']', '^', '_',
  '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g',
  'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
  'p', 'q', 'r', 's', 't', 'u', 'v', 'w',
  'x', 'y', 'z', '{', '|', '}', '~', ''
]

const STATE_METHOD = 0
const STATE_VERSION_MAJOR = 1
const STATE_VERSION_MINOR = 2
const STATE_PATH = 3
const STATE_HEADER_KEY = 4
const STATE_HEADER_VALUE = 5
const STATE_BODY = 6

class HttpParser {
  constructor () {
    this.info = {
      method: '',
      path: '',
      headers: {},
      versionMajor: undefined,
      versionMinor: undefined
    }
    this.state = STATE_METHOD
    this.headerKey = ''
    this.headerValue = ''
    this.nextCouldHaveSpace = false
  }

  execute (buffer) {
    for (var i = 0; i < buffer.length; i++) {
      const char = buffer[i]
      if (this.state === STATE_METHOD) {
        if (char === 0x20) {
          this.state = STATE_PATH
        } else {
          this.info.method += codeLookup[char]
        }
      } else if (this.state === STATE_PATH) {
        if (char === 0x20) {
          this.state = STATE_VERSION_MAJOR
        } else {
          this.info.path += codeLookup[char]
        }
      } else if (this.state === STATE_VERSION_MAJOR) {
        if (char === 0x2e) {
          this.state = STATE_VERSION_MINOR
        } else if (char !== 0x48 && char !== 0x54 && char !== 0x50 && char !== 0x2f) {
          this.info.versionMajor = codeLookup[char]
        }
      } else if (this.state === STATE_VERSION_MINOR) {
        if (char === 0x0d && buffer[i + 1] === 0x0a) {
          this.state = STATE_HEADER_KEY
          i++
        } else {
          this.info.versionMinor = codeLookup[char]
        }
      } else if (this.state === STATE_HEADER_KEY) {
        if (char === 0x3a) {
          if (buffer[i + 1] === 0x20) { i++ }
          this.state = STATE_HEADER_VALUE
        } else if (this.nextCouldHaveSpace && char === 0x20) {
          this.nextCouldHaveSpace = false
        } else {
          this.headerKey += codeLookup[char]
        }
      } else if (this.state === STATE_HEADER_VALUE) {
        if (char === 0x0d && buffer[i + 1] === 0x0a) {
          if (buffer[i + 2] === 0x0d && buffer[i + 3] === 0x0a) {
            this.state = STATE_BODY
            i += 3
            this[HttpParser.kOnHeadersComplete](this.info)
          } else {
            this.state = STATE_HEADER_KEY
            this.info.headers[this.headerKey] = this.headerValue
            this.headerKey = ''
            this.headerValue = ''
            i++
          }
        } else if (this.nextCouldHaveSpace && char === 0x20) {
          this.nextCouldHaveSpace = false
        } else {
          this.headerValue += codeLookup[char]
        }
      } else if (this.state === STATE_BODY) {
        this[HttpParser.kOnBody]()
        this[HttpParser.kOnMessageComplete]()
        this.state = STATE_METHOD
        break
      }
    }
    this.nextCouldHaveSpace = this.state === STATE_HEADER_VALUE && this.headerValue.length === 0
  }
}

HttpParser.kOnHeadersComplete = Symbol('headers complete')
HttpParser.kOnBody = Symbol('body')
HttpParser.kOnMessageComplete = Symbol('message complete')

module.exports = HttpParser
