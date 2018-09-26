const {ZipFile} = require('yazl')

function shapefile(names, data = '') {
  const zip = new ZipFile()

  if (!Array.isArray(names)) {
    names = [names]
  }

  for (const name of names) {
    zip.addBuffer(Buffer.from('shp content' + data), `${name}.shp`)
    zip.addBuffer(Buffer.from('shx content' + data), `${name}.shx`)
    zip.addBuffer(Buffer.from('dbf content' + data), `${name}.dbf`)
    zip.addBuffer(Buffer.from('prj content' + data), `${name}.prj`)
    zip.addBuffer(Buffer.from('cpg content' + data), `${name}.cpg`)
  }

  zip.end()

  return zip.outputStream
}

module.exports = {shapefile}
