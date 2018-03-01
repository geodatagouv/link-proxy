const {checkQueue} = require('../../lib/queues')

const analyze = require('./analyze')

checkQueue.process(async ({data: {location}}) => {
  await analyze(location)
})
