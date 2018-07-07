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

function isMainType(node, type) {
  const isMain = type.extensions.some(
    ext => node.fileTypes.some(ft => ft.ext && ft.ext.toLowerCase() === ext)
  )

  if (isMain && type.related) {
    // If the type has related files and the file also matches
    // one of the related extensions, it does not qualify as the
    // main type of the bundle.

    return !type.related.some(
      rel => node.fileTypes.some(ft => ft.ext && ft.ext.toLowerCase() === rel)
    )
  }

  return isMain
}

function matchPatterns(nodes, types = fileTypes.types) {
  const bundles = []
  const ignored = [...nodes]

  // It is important to loop over all types sequentially as the order
  // defined in `types` is important.
  for (const type of types) {
    const matching = []

    for (const node of ignored) {
      if (isMainType(node, type)) {
        matching.push(node)
      }
    }

    for (const node of matching) {
      const bundle = {
        type: type.name,
        files: [node],
        changed: node.unchanged ? 0 : 1
      }

      remove(ignored, node)

      if (type.related && type.related.length > 0) {
        const related = getRelated(ignored, node, type)

        bundle.files = bundle.files.concat(related)

        related.forEach(n => {
          if (!n.unchanged) {
            ++bundle.changed
          }

          remove(ignored, n)
        })
      }

      bundles.push(bundle)
    }
  }

  return {bundles, ignored}
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

  const {bundles, ignored} = matchPatterns(files)
  for (const bundle of bundles) {
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

  result.ignored.push(...ignored)
}

function flatten(node) {
  const result = {
    temporaries: [],
    ignored: [],
    links: {}
  }

  flattenNodes(result, [node])

  return result
}

module.exports = {flatten}
