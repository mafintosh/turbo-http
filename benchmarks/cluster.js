const cluster = require('cluster')
const n = require('os').cpus().length / 2

module.exports = worker => {
  if (cluster.isMaster) {
    for (let i = 0; i < n; ++i) {
      cluster.fork()
    }
  } else {
    worker()
  }
}
