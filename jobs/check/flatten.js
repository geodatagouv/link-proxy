const {readFileSync} = require('fs')
const {extname, join} = require('path')
const {remove} = require('lodash')
const {safeLoad} = require('js-yaml')

const fileTypes = safeLoad(readFileSync(join(__dirname, '../../types.yml')))

function getRelated(tokens, token, type) {
  return tokens.filter(t => {
    const ext = extname(token.fileName).substring(1)
    const extensionless = token.fileName.slice(0, -ext.length - 1)

    return type.related.some(ext => t.fileName === `${extensionless}.${ext}`)
  })
}

function matchPatterns(nodes, fileTypes) {
  const files = []
  const rest = [...nodes]

  fileTypes.forEach(type => {
    const matchingNodes = rest.filter(node => type.extensions.some(ext =>
      node.fileTypes.some(type => type.ext.toLowerCase() === ext.toLowerCase())
    ))

    matchingNodes.forEach(node => {
      const file = {
        type: type.name,
        main: node,

        // This field is the total amount of files (main + related)
        total: 1,

        // This field is the amount of changed files (cache misses)
        changed: node.unchanged ? 0 : 1
      }

      remove(rest, node)

      if (type.related && type.related.length > 0) {
        file.related = getRelated(nodes, node, type)
        file.total += file.related.length

        file.related.forEach(n => {
          if (!n.unchanged) {
            ++file.changed
          }

          remove(rest, n)
        })
      }

      files.push(file)
    })
  })

  return files
}

function flatten(nodes) {
  if (!Array.isArray(nodes)) {
    nodes = [nodes]
  }

  const files = []
  const result = {
    errors: [],
    warnings: [],
    files: [],
    temporary: []
  }

  nodes.forEach(node => {
    if (node.error) {
      result.errors.push(node)
      return
    }

    if (node.warning) {
      result.warnings.push(node)
    }

    if (node.temporary) {
      result.temporary.push(node.temporary)
    }

    if (node.type === 'file') {
      files.push(node)
    }

    if (node.children) {
      const childResult = flatten(node.children, fileTypes)

      result.errors = result.errors.concat(childResult.errors)
      result.warnings = result.warnings.concat(childResult.warnings)
      result.files = result.files.concat(childResult.files)
    }
  })

  result.files = result.files.concat(matchPatterns(files, fileTypes))

  return result
}

module.exports = {flatten}
