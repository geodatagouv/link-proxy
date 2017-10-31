const {analyzeLocation, extractFiles} = require('plunger')

async function handler({data: {location}}) {
  const tree = await analyzeLocation(location)

  const {files} = extractFiles(tree)

  console.log('checking', files)
}

module.exports = {handler}
