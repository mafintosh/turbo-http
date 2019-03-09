const service = require('restana')()

service.get('/', (req, res) => res.send('Thunderstruck..!'))

service.start(5050)
