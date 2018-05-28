const autocannon = require('autocannon')
const chalk = require('chalk')
const fs = require('fs')
const minimist = require('minimist')
const ora = require('ora')
const Table = require('cli-table')
const { fork } = require('child_process')

const files = fs
  .readdirSync(`${__dirname}/compare`)
  .filter((file) => file.match(/(.+)\.js$/))
  .sort()

const argv = minimist(process.argv.slice(2))
const canrejectn = (title = null) =>
  new Promise((resolve, reject) => {
    autocannon(
      Object.assign(
        {},
        {
          url: argv.u || 'http://localhost:5050',
          connections: argv.c || 100,
          pipelining: argv.p || 10,
          duration: argv.d || 5
        },
        { title }
      ),
      (error, result) => {
        if (error) {
          return reject(error)
        }
        return resolve(result)
      }
    )
  })

let index = 0
const benchmark = async (results) => {
  results.push(
    await new Promise(async (resolve, reject) => {
      const file = files[index]
      const forked = fork(`${__dirname}/compare/${file}`)
      try {
        // Warm-up & test
        const spin = ora(`Warming up ${chalk.blue(file)}`).start()
        spin.color = 'yellow'
        await canrejectn()
        spin.text = `Running ${chalk.blue(file)}`
        spin.color = 'green'
        const result = await canrejectn(file)
        spin.text = `${chalk.blue(file)}`
        spin.succeed()
        forked.kill('SIGINT')
        return resolve(result)
      } catch (error) {
        return reject(error)
      }
    })
  )

  index += 1
  if (index < files.length) {
    return benchmark(results)
  }

  return results.sort((a, b) => {
    if (b.requests.average < a.requests.average) {
      return -1
    }

    return b.requests.average > a.requests.average ? 1 : 0
  })
}

benchmark([]).then((results) => {
  const table = new Table({
    head: ['', 'Requests/s', 'Latency', 'Throughput/Mb']
  })

  results.forEach((result) => {
    table.push([
      chalk.blue(result.title),
      result.requests.average,
      result.latency.average,
      (result.throughput.average / 1024 / 1024).toFixed(2)
    ])
  })

  console.log(table.toString())
})
