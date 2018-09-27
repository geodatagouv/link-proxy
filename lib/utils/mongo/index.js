const {MongoClient, ObjectID} = require('mongodb')
const debug = require('debug')('link-proxy:mongo')

const indexes = require('./indexes')

class Mongo {
  async connect() {
    this.client = await MongoClient.connect(process.env.MONGO_URL || 'mongodb://localhost:27017', {
      useNewUrlParser: true,
      reconnectTries: 1
    })
    this.db = this.client.db(process.env.MONGO_DB || 'link-proxy')
  }

  async ensureIndexes() {
    await Promise.all(indexes.drop.map(spec => {
      debug(`Dropping index "${spec.name}" from collection "${spec.collection}"`)

      return this.db.collection(spec.collection).dropIndex(spec.name)
    }))

    await Promise.all(indexes.create.map(spec => {
      debug(`Creating index "${spec.options.name}" in collection "${spec.collection}"`)

      return this.db.collection(spec.collection).createIndex(spec.fieldOrSpec, spec.options)
    }))
  }

  disconnect(force) {
    if (this.client && this.client.isConnected()) {
      return this.client.close(force)
    }
  }

  parseObjectID(string) {
    try {
      return new ObjectID(string)
    } catch (error) {
      return null
    }
  }
}

module.exports = new Mongo()
module.exports.ObjectID = ObjectID
