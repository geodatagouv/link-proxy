function downloadsSnapshot(downloads) {
  return downloads.map(({name, type, archive, path, files}) => {
    return {
      name,
      type,
      archive,
      path,
      files
    }
  }).sort((a, b) => {
    if (a.name < b.name) {
      return -1
    }

    if (a.name > b.name) {
      return 1
    }

    return 0
  })
}

module.exports = {downloadsSnapshot}
