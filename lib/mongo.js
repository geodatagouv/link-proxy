const {MongoClient} = require('mongodb')

class Mongo {
  async connect(options, db) {
    this.client = await MongoClient.connect(options)
    this.db = this.client.db(db)
  }
}

module.exports = new Mongo()
