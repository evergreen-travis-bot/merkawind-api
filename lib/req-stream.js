'use strict'

const normalize = require('./normalize')
const CONST = require('./constants')
const from = require('from2').obj
const got = require('got')

const fetch = (opts) => got.get(CONST.ENDPOINT, opts)

const DEFAULT = {
  sold: false,
  pages: Infinity
}

function createStream (opts) {
  const {
    key: wrapAPIKey,
    pages = DEFAULT.pages,
    sold = DEFAULT.sold
  } = opts

  function reqStream (query) {
    Object.assign(query, {wrapAPIKey, page: 1})
    const fetchOpts = {json: true, query}
    const hasFetch = () => query.page - 1 < pages

    const stream = from(function (size, next) {
      if (!hasFetch()) return next(null, null)

      fetch(fetchOpts)
        .then(res => {
          const {body} = res

          if (!body.success) {
            // this case control when you want to fetch the follow
            // page but it doesn't exist. You need to close the
            // stream gracefully if previous pages was fetched.
            const err = query.page > 1 ? null : body.messages
            return next(err, null)
          }

          const {ads} = body.data
          if (!ads.length) return next(null, null)

          const items = sold ? ads : ads.filter(item => !(item.sold))
          const lastItem = items.pop()

          items.forEach(item => this.push(normalize(item)))
          ++query.page
          return next(null, normalize(lastItem))
        })
        .catch(next)
    })

    return stream
  }

  return reqStream
}

module.exports = createStream
