const {parse} = require('url')

const UNSUPPORTED = [
  /\.7z\.\d{3}$/
]

function isUnsupported(location) {
  const {pathname} = parse(location)

  return UNSUPPORTED.some(regexp => regexp.test(pathname))
}

module.exports = {isUnsupported}
