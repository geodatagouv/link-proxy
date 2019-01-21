const {upload} = require('../../../../jobs/check/upload')

const {S3_BUCKET} = process.env

describe('jobs.check.upload', () => {
  it('should upload a file', async () => {
    const res = await upload({
      files: [
        {
          fileName: 'HYD_ZON_BassVers_Rade_compl_s.json',
          path: '__tests__/unit/jobs/check/__fixtures__/HYD_ZON_BassVers_Rade_compl_s.json',
          url: 'http://example.org/files/HYD_ZON_BassVers_Rade_compl_s.json',
          unchanged: false
        }
      ]
    }, {
      _id: 'HYD_ZON_BassVers_Rade_compl_s',
      createdAt: new Date(2000, 0, 1)
    })

    expect(res.location).toEqual(
      `http://localhost:9000/${S3_BUCKET}/example.org/2000-01-01/hyd-zon-bassvers-rade-compl-s/hyd-zon-bassvers-rade-compl-s.json`
    )
  })

  it('should upload a zip file', async () => {
    const res = await upload({
      files: [
        {
          fileName: 'N_PERIM_MAET_ZINF_S_R53_2009.json',
          fileTypes: [
            {ext: 'json', source: 'path:filename'}
          ],
          path: '__tests__/unit/jobs/check/__fixtures__/N_PERIM_MAET_ZINF_S_R53_2009.json',
          url: 'http://example.org/files/N_PERIM_MAET_ZINF_S_R53_2009.json',
          unchanged: false
        },
        {
          fileName: 'HYD_ZON_BassVers_Rade_compl_s.json',
          fileTypes: [
            {ext: 'json', source: 'path:filename'}
          ],
          path: '__tests__/unit/jobs/check/__fixtures__/HYD_ZON_BassVers_Rade_compl_s.json',
          url: 'http://example.org/files/HYD_ZON_BassVers_Rade_compl_s.json',
          unchanged: false
        }
      ]
    }, {
      _id: 'N_PERIM_MAET_ZINF_S_R53_2009',
      createdAt: new Date(2000, 0, 1)
    })

    expect(res.location).toEqual(
      `http://localhost:9000/${S3_BUCKET}/example.org/2000-01-01/n-perim-maet-zinf-s-r53-2009/n-perim-maet-zinf-s-r53-2009.zip`
    )
  })

  it('should reuse the previous archive when only one file is modified', async () => {
    const files = [
      {
        fileName: 'N_PERIM_MAET_ZINF_S_R53_2009.json',
        fileTypes: [
          {ext: 'json', source: 'path:filename'}
        ],
        path: '__tests__/unit/jobs/check/__fixtures__/N_PERIM_MAET_ZINF_S_R53_2009.json',
        url: 'http://example.org/files/N_PERIM_MAET_ZINF_S_R53_2009.json',
        unchanged: false
      },
      {
        fileName: 'HYD_ZON_BassVers_Rade_compl_s.json',
        fileTypes: [
          {ext: 'json', source: 'path:filename'}
        ],
        path: '__tests__/unit/jobs/check/__fixtures__/HYD_ZON_BassVers_Rade_compl_s.json',
        url: 'http://example.org/files/HYD_ZON_BassVers_Rade_compl_s.json',
        unchanged: false
      }
    ]

    const res1 = await upload({
      files
    }, {
      _id: 'reuse',
      createdAt: new Date(2000, 0, 1)
    })

    expect(res1.location).toEqual(
      `http://localhost:9000/${S3_BUCKET}/example.org/2000-01-01/reuse/n-perim-maet-zinf-s-r53-2009.zip`
    )

    files[1].unchanged = true

    const res2 = await upload({
      files
    }, {
      _id: 'reuse',
      createdAt: new Date(2000, 0, 2)
    }, {
      url: res1.location
    })

    expect(res2.location).toEqual(
      `http://localhost:9000/${S3_BUCKET}/example.org/2000-01-02/reuse/n-perim-maet-zinf-s-r53-2009.zip`
    )
  })

  it('should re-upload everything if the previous bundle is not a valid archive', async () => {
    const res1 = await upload({
      files: [
        {
          fileName: 'HYD_ZON_BassVers_Rade_compl_s.json',
          path: '__tests__/unit/jobs/check/__fixtures__/HYD_ZON_BassVers_Rade_compl_s.json',
          url: 'http://example.org/files/HYD_ZON_BassVers_Rade_compl_s.json',
          unchanged: false
        }
      ]
    }, {
      _id: 'reupload',
      createdAt: new Date(2000, 0, 1)
    })

    expect(res1.location).toEqual(
      `http://localhost:9000/${S3_BUCKET}/example.org/2000-01-01/reupload/hyd-zon-bassvers-rade-compl-s.json`
    )

    const res2 = await upload({
      files: [
        {
          fileName: 'N_PERIM_MAET_ZINF_S_R53_2009.json',
          fileTypes: [
            {ext: 'json', source: 'path:filename'}
          ],
          path: '__tests__/unit/jobs/check/__fixtures__/N_PERIM_MAET_ZINF_S_R53_2009.json',
          url: 'http://example.org/files/N_PERIM_MAET_ZINF_S_R53_2009.json',
          unchanged: false
        },
        {
          fileName: 'HYD_ZON_BassVers_Rade_compl_s.json',
          fileTypes: [
            {ext: 'json', source: 'path:filename'}
          ],
          path: '__tests__/unit/jobs/check/__fixtures__/HYD_ZON_BassVers_Rade_compl_s.json',
          url: 'http://example.org/files/HYD_ZON_BassVers_Rade_compl_s.json',
          unchanged: true
        }
      ]
    }, {
      _id: 'reupload',
      createdAt: new Date(2000, 0, 2)
    }, {
      url: res1.location
    })

    expect(res2.location).toEqual(
      `http://localhost:9000/${S3_BUCKET}/example.org/2000-01-02/reupload/n-perim-maet-zinf-s-r53-2009.zip`
    )
  })
})
