const {extname} = require('path')
const {remove} = require('lodash')

const fileTypes = require('../../lib/types')

function getRelated(tokens, token, type) {
  return tokens.filter(t => {
    const ext = extname(token.fileName).substring(1)
    const extensionless = token.fileName.slice(0, -ext.length - 1)

    return type.related.some(ext => t.fileName === `${extensionless}.${ext}`)
  })
}

function isMainType(file, type) {
  const matches = type.extensions.some(
    ext => file.fileTypes.some(ft => ft.ext && ft.ext.toLowerCase() === ext)
  )

  if (matches && type.related) {
    // If the type has related files and the file also matches one of the related extensions,
    // it does not qualify as the main type of the bundle.

    return !type.related.some(
      rel => file.fileTypes.some(ft => ft.ext && ft.ext.toLowerCase() === rel)
    )
  }

  return matches
}

function matchPatterns(files, fileTypes) {
  const bundles = []
  const rest = [...files]

  fileTypes.forEach(type => {
    const matchingNodes = rest.filter(file => isMainType(file, type))

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

function flattenNodes(result, nodes, parentNode) {
  const files = []
  const parentLink = parentNode ? result.links[parentNode.url || parentNode.fromUrl] : null

  for (const node of nodes) {
    let nodeLink

    if (node.url) {
      result.links[node.url] = {
        urls: [],
        bundles: [],
        errors: [],
        warnings: []
      }

      if (parentLink) {
        parentLink.urls.push(node.url)
      }

      nodeLink = result.links[node.url]
    }

    if (node.error) {
      if (nodeLink) {
        nodeLink.errors.push(node.error)
        continue
      }

      parentLink.errors.push(node.error)
      return
    }

    if (node.warning) {
      (nodeLink || parentLink).warnings.push(node.warning)
    }

    if (node.type === 'file') {
      files.push(node)
    }

    if (node.temporary) {
      result.temporaries.push(node.temporary)
    }

    if (node.children) {
      flattenNodes(result, node.children, node)
    }
  }

  for (const bundle of matchPatterns(files, fileTypes)) {
    const firstUrl = bundle.files[0].url

    if (bundle.files.length === 1 && firstUrl) {
      result.links[firstUrl].bundles.push(bundle)
    } else {
      // Big question: What happens if there’s a shapefile by itself?
      // Should we add it to an archive by itself?
      // This does not. It will be stored unarchived.

      parentLink.bundles.push(bundle)
    }
  }
}

function flatten(node) {
  const result = {
    temporaries: [],
    links: {}
  }

  flattenNodes(result, [node])

  return result
}

module.exports = {flatten}
