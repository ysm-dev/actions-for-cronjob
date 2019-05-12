const nodeFetch = require('node-fetch')
const yaml = require('js-yaml')
const _ = require('partial-js')
const sh = require('shelljs')

const fetch = (url, options, timeout = 30000) => {
  return Promise.race([
    nodeFetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
  ])
}

const dbFileURL = 'https://raw.githubusercontent.com/sarojaba/awesome-devblog/master/db.yml'

!(async () => {
  await _.go(
    fetch(dbFileURL),
    _('text'),
    data => yaml.safeLoad(data),
    _.tap(data => _.log(`All length : ${data.length}`)),
    _.filter(user => user.rss),
    _.tap(feeds => _.log(`RSS length : ${feeds.length}`)),
    _.map(user => user.rss),
    arr => ['http://devblog.selfhow.com/feed/', ...arr],
    _.map((rss, i) => sh.exec(`wget -O feeds/${i}.xml ${rss}`, { async: !rss.includes('medium.com'), silent: true })),
    _.tap(() => _.log(`Finish Download all feeds.`)),
    _.tap(() => {
      sh.exec(`git add .`)
      sh.exec(`git config --global user.email "octocat@github.com"`)
      sh.exec(`git commit -m "Auto Deploy By Github Actions"`)
      sh.exec(`git push https://${process.env.GH_PAT}@github.com/ysm0622/actions-for-cronjob.git HEAD:master`)
    }),
  )
})()
