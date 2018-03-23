const {MongoClient, ObjectID} = require('mongodb')

class Mongo {
  async connect() {
    this.client = await MongoClient.connect(process.env.MONGO_URL || 'mongodb://localhost', {
      reconnectTries: 1
    })
    this.db = this.client.db(process.env.MONGO_DB || 'link-proxy')
  }

  async disconnect(force) {
    return this.client.close(force)
  }
}

module.exports = new Mongo()
module.exports.ObjectID = ObjectID
