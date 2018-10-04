// This file describes the MongoDB indexes that will be created or dropped
// when executing the applications.
// Make sure that a custom `options.name` is specified when creating an
// index, as it will be used to drop the index if needed in the future.

module.exports = {
  create: [
    // Collection: links
    // =================
    // Make sure that there are no duplicates and allow faster lookups.
    {
      collection: 'links',
      fieldOrSpec: 'locations',
      options: {
        name: 'locations_unique_1',
        unique: true
      }
    },

    // Collection: checks
    // ==================
    // Allow faster lookups when retrieving a link’s checks.
    {
      collection: 'checks',
      fieldOrSpec: 'linkId',
      options: {
        name: 'linkId_1'
      }
    },

    // Make sure that there are no duplicates and allow faster lookups.
    {
      collection: 'checks',
      fieldOrSpec: {
        linkId: 1,
        number: 1
      },
      options: {
        name: 'linkId_number_unique_1',
        unique: true
      }
    },

    // Allow faster lookups when retrieving a link’s last non-running check.
    {
      collection: 'checks',
      fieldOrSpec: {
        linkId: 1,
        number: 1,
        state: 1
      },
      options: {
        name: 'linkId_number_state_1'
      }
    },

    // Collection: files
    // =================
    // Allow faster lookups when retrieving file cache.
    {
      collection: 'files',
      fieldOrSpec: {
        linkId: 1,
        digest: 1,
        filePath: 1
      },
      options: {
        name: 'linkId_digest_filePath_1'
      }
    },

    // Collection: downloads
    // =====================
    // Allow faster sorts
    {
      collection: 'downloads',
      fieldOrSpec: {
        createdAt: 1
      },
      options: {
        name: 'createdAt_1'
      }
    },

    // Collection: subscribers
    // =======================
    // Make sure that there are no duplicates.
    {
      collection: 'subscribers',
      fieldOrSpec: {
        url: 1
      },
      options: {
        name: 'url_1',
        unique: 1
      }
    }
  ],

  drop: []
}
