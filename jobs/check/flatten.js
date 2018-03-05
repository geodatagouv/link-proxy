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

function matchPatterns(files, fileTypes) {
  const bundles = []
  const rest = [...files]

  fileTypes.forEach(type => {
    const matchingNodes = rest.filter(file => type.extensions.some(ext =>
      file.fileTypes.some(type => type.ext.toLowerCase() === ext.toLowerCase())
    ))

    matchingNodes.forEach(node => {
      const bundle = {
        type: type.name,
        files: [node],
        changed: node.unchanged ? 0 : 1
      }

      remove(rest, node)

      if (type.related && type.related.length > 0) {
        const related = getRelated(files, node, type)

        bundle.files = bundle.files.concat(related)

        related.forEach(n => {
          if (!n.unchanged) {
            ++bundle.changed
          }

          remove(rest, n)
        })
      }

      bundles.push(bundle)
    })
  })

  return bundles
}

function flatten(nodes, parentNode) {
  if (!Array.isArray(nodes)) {
    nodes = [nodes]
  }

  const files = []
  const urls = []
  const result = {
    urls: {},
    errors: [],
    warnings: [],
    bundles: [],
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

    if (node.url) {
      result.urls[node.url] = {}
      urls.push(node.url)
    }

    if (node.children) {
      const childResult = flatten(node.children, node)

      result.errors = result.errors.concat(childResult.errors)
      result.warnings = result.warnings.concat(childResult.warnings)
      result.bundles = result.bundles.concat(childResult.bundles)

      Object.assign(result.urls, childResult.urls)
    }
  })

  if (parentNode && parentNode.url) {
    result.urls[parentNode.url] = urls
  }

  result.bundles = result.bundles.concat(matchPatterns(files, fileTypes))

  return result
}

module.exports = {flatten}
