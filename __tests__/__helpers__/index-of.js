function indexOf(paths) {
  if (!Array.isArray(paths)) {
    paths = [paths]
  }

  return `
  <h1>Index of /</h1>
  ${paths.map(
    p => `<a href="${p}">${p}</a>`
  )}
  `
}

module.exports = indexOf
