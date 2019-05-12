const nodeFetch = require('node-fetch')
const yaml = require('js-yaml')
const { to } = require('await-to-js')
const Parser = require('rss-parser')
const parser = new Parser()
// const parser = require('fast-xml-parser')
const RSSCombiner = require('rss-combiner')
const _ = require('partial-js')

const fetch = (url, options, timeout = 30000) => {
  return Promise.race([
    nodeFetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
  ])
}

const dbFileURL = 'https://raw.githubusercontent.com/sarojaba/awesome-devblog/master/db.yml'

!(async () => {
  const users = _.go(
    fetch(dbFileURL),
    _('text'),
    data => yaml.safeLoad(data),
    _.tap(data => _.log(`All length : ${data.length}`)),
    _.filter(user => user.rss),
    _.tap(feeds => _.log(`RSS length : ${feeds.length}`)),
  )

  const mediumUsers = _.go(
    users,
    _.filter(user => user.rss.includes('medium.com')),
    _.tap(users => _.log(`Medium Users : ${users.length}`)),
  )
  const otherUsers = await _.go(
    users,
    _.filter(user => !user.rss.includes('medium.com')),
    _.tap(users => _.log(`Other Users : ${users.length}`)),
  )

  const promises = [{ rss: 'http://devblog.selfhow.com/feed/' }, ...otherUsers].map(user =>
    fetch(user.rss).catch(e => {
      // _.log(e.message)
      _.log(`Error : ${user.rss}`)
      return null
    }),
  )

  await _.go(
    promises,
    promises => Promise.all(promises),
    _.filter(_.identity),
    // _.tap(_.log),
    // _.filter(res => res.status >= 200 && res.status < 300),
    _.tap(res => _.log(`Success length : ${res.length}`)),
    // _.tap(res => _.log(res)),
    _.map(async res => ({ url: res.url, text: await res.text() })),
    _.tap(() => _.log(`Finish Stringify`)),
    // _.tap(texts => _.log(texts)),
    _.map(r => {
      // console.log(`parse ${i}`)
      return {
        p: parser.parseString(r.text).catch(e => {
          _.log(`Parse Error : ${r.url}`)
          return null
        }),
      }
    }),
    promises => Promise.all(promises.map(p => p.p)),
    // _.tap(_.log),
    _.filter(_.identity),
    _.tap(res => _.log(`Parsed length : ${res.length}`)),
    _.map(rss => ({
      ...rss,
      items: _.map(rss.items, item => ({
        ...item,
        title:
          typeof item.title === 'string' && item.title.includes('개발자 메타블로그')
            ? item.title
            : `[${rss.title}] ${item.title}`,
      })),
    })),
    _.map(rss => rss.items),
    _.flatten,
    _.sortBy(item => -new Date(item.pubDate)),
    _.filter(item => Date.now() > new Date(item.pubDate)),
    _.tap(res => _.log(`Filtered length : ${res.length}`)),
    _.take(1000),
    _.uniq(item => item.title),
    _.tap(res => _.map(res, item => _.log(item.title))),
  )

  return

  const failed = []
  const success = []

  const feeds = await Promise.all(promises)

  const successes = feeds.filter(res => res).filter(res => res.status >= 200 && res.status < 300)

  _.log(`filter all successful feed url`)

  const texts = await Promise.all(successes.map(res => res.text()))

  _.log(`textify all responses`)

  const valids = texts.map((text, i) => {
    if (parser.validate(text) === true) {
      return true
    } else {
      _.log(`${i} : ${successes[i].url}`)
      return false
    }
  })

  const validRSS = successes.filter((_, i) => valids[i])

  _.log(validRSS.length)

  const feedConfig = {
    title: 'Tech news from Guardian and BBC',
    size: Infinity,
    feeds: validRSS.map(res => res.url),
    pubDate: new Date(),
  }

  RSSCombiner(feedConfig)
    .then(combinedFeed => {
      _.log(combinedFeed)
      const xml = combinedFeed.xml()
      // _.log(xml)
    })
    .catch(e => {
      _.log(e)
    })

  // _.log(`texts : ${texts.length}`)

  // const datas = await Promise.all(
  //   texts.map(text =>
  //     parser.parseString(text).catch(e => {
  //       // _.log(e)
  //       return null
  //     })
  //   )
  // )

  // _.log(datas.length)

  // _.log(datas.filter(r => r).length)

  // datas
  //   .filter(r => r)
  //   .map(data => {
  //     _.log(data)
  //   })
  // feeds.map(res => {
  //   if (res) {
  //     _.log(`${res.status} : ${res.url}`)
  //   }
  // })

  // for (let i = 0; i < users.length; i++) {
  //   _.log(i)
  //   const [e, res] = await to(fetch(users[i].rss))
  //   if (e) {
  //     _.log(`[${i}] ERROR! : ${e.config.url}`)
  //     failed.push(e.config.url)
  //     continue
  //   }
  //   if (res) {
  //     _.log(`[${i}] ${res.status} : ${res.config.url}`)
  //   }
  // }
  // _.log(failed)
})()

const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
