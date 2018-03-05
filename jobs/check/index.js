const {checkQueue} = require('../../lib/utils/queues')

const analyze = require('./analyze')

checkQueue.process(async ({data: {link, name: location}}) => {
  await analyze(link, location)
})
