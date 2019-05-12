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
  const RSSs = await _.go(
    fetch(dbFileURL),
    _('text'),
    data => yaml.safeLoad(data),
    _.tap(data => _.log(`All length : ${data.length}`)),
    _.filter(user => user.rss),
    _.tap(feeds => _.log(`RSS length : ${feeds.length}`)),
    _.map(user => user.rss),
    _.map((rss, i) => {
      if (rss.includes('medium.com')) {
        sh.exec(`wget -O feeds/${i}.xml ${rss}`, { async: false, silent: true })
      } else {
        sh.exec(`wget -O feeds/${i}.xml ${rss}`, { async: true, silent: true })
      }
    }),
    _.tap(() => _.log(`Finish Download all feeds.`)),
    _.tap(() => {
      sh.exec(`git add .`)
      sh.exec(`git config --global user.email "ysm0622@gmail.com"`)
      sh.exec(`git commit -m "Update"`)
      sh.exec(`git push https://${process.env.GH_PAT}@github.com/ysm0622/actions-for-cronjob.git HEAD:master`)
    }),
  )
})()
