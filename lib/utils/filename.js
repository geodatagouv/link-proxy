const {parse} = require('path')

function getPossibleExtensions(fileName) {
  const result = []

  let found = false
  let ext = ''

  do {
    const parsed = parse(fileName)
    if (parsed.ext.length === 0 || parsed.ext === '.') {
      break
    }

    found = true
    fileName = parsed.name
    ext = parsed.ext + ext

    result.push({
      name: parsed.name,
      ext: ext.substring(1)
    })
  } while (found)

  return result
}

module.exports = {
  getPossibleExtensions
}
