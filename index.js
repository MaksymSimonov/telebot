const credentials = require('./credentials.json')

const FeedSub = require('feedsub')
const rssFeed = credentials.rss_feed
let reader = new FeedSub(rssFeed, {
  interval: 5 // Check news every 5 minute.
})

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ news: [], users: []}).write()

const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const session = require('telegraf/session')
const token = credentials.telegram_bot_token
const bot = new Telegraf(token)

// // Register session middleware
bot.use(session())

// Register logger middleware
bot.use((ctx, next) => {
  const start = new Date()
  return next().then(() => {
    const ms = new Date() - start
    console.log('response time %sms', ms)
  })
})

bot.start((ctx) => {
  let user = ctx.message.chat
  let userInDb = db.get('users').find({ id: user.id }).value()
  if(userInDb) {
    ctx.reply('You have already started this bot.')
  } else {
    db.get('users').push(user).write()
    ctx.reply('Welcome! News coming soon.')
  }
})

reader.on('item', (news) => {
  const newsInDb = db.get('news').find({ link: news.link }).value()
  if(newsInDb) {
    console.log('This news is already exists:')
    console.log(news.link)
  } else {
    db.get('news').push(news).write()
    let link = news.link
    db.get('users').value().forEach(user => bot.telegram.sendMessage(user.id, link))
  }
})

bot.launch()
reader.start()