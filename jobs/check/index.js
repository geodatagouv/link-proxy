const {checkQueue} = require('../../lib/utils/queues')

const analyze = require('./analyze')

checkQueue.process(async ({data: {linkId, name: location}}) => {
  await analyze(linkId, location)
})
