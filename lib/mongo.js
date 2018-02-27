const {MongoClient} = require('mongodb')

class Mongo {
  async connect(options, db) {
    this.client = await MongoClient.connect(options)
    this.db = this.client.db(db)
  }

  async close() {
    return this.client.close()
  }
}

module.exports = new Mongo()
