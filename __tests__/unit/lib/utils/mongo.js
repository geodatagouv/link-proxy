const mongo = require('../../../../lib/utils/mongo')

describe('lib.utils.mongo', () => {
  describe('parseObjectID', () => {
    it('should return an ObjectID if the input is valid', () => {
      const id = mongo.parseObjectID('5baa8d29b22014e817d13541')

      expect(id).toBeInstanceOf(mongo.ObjectID)
    })

    it('should return null if the input is not valid', () => {
      const id = mongo.parseObjectID('invalid object id')

      expect(id).toBe(null)
    })
  })
})
