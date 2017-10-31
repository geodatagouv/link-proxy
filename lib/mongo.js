const {MongoClient} = require('mongodb')

class Mongo {
  async connect() {
    this.db = await MongoClient.connect.apply(MongoClient, arguments)

    return this.db
  }
}

module.exports = new Mongo()
