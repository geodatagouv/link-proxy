const {ZipFile} = require('yazl')

function shapefile(names) {
  const zip = new ZipFile()

  if (!Array.isArray(names)) {
    names = [names]
  }

  for (const name of names) {
    zip.addBuffer(Buffer.from('shp content'), `${name}.shp`)
    zip.addBuffer(Buffer.from('shx content'), `${name}.shx`)
    zip.addBuffer(Buffer.from('dbf content'), `${name}.dbf`)
    zip.addBuffer(Buffer.from('prj content'), `${name}.prj`)
    zip.addBuffer(Buffer.from('cpg content'), `${name}.cpg`)
  }

  zip.end()

  return zip.outputStream
}

module.exports = {shapefile}
