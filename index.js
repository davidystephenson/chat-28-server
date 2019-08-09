const express = require('express')
const Sse = require('json-sse')
const bodyParser = require('body-parser')
const cors = require('cors')
const Sequelize = require('sequelize')

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5430/postgres'
const db = new Sequelize(databaseUrl)

db
  .sync({ force: false })
  .then(() => console.log('Database synced'))

const Message = db.define(
  'message',
  {
    text: Sequelize.STRING,
    user: Sequelize.STRING
  }
)

const Channel = db.define(
  'channel',
  {
    name: Sequelize.STRING
  }
)

Message.belongsTo(Channel)
Channel.hasMany(Message)

const stream = new Sse()

const app = express()

const middleware = cors()
app.use(middleware)

const jsonParser = bodyParser.json()
app.use(jsonParser)

app.get(
  '/stream',
  async (request, response) => {
    const channels = await Channel
      .findAll({ include: [Message] })

    const data = JSON.stringify(channels)
    stream.updateInit(data)

    stream.init(request, response)
  }
)

app.post(
  '/message',
  async (request, response) => {
    const {
      message,
      user,
      channelId
    } = request.body

    const entity = await Message.create({
      text: message,
      user,
      channelId
    })

    const channels = await Channel.findAll({
      include: [Message]
    })

    const data = JSON.stringify(channels)

    stream.updateInit(data)
    stream.send(data)

    response.send(entity)
  }
)

app.post(
  '/channel',
  async (request, response) => {
    const channel = await Channel.create(request.body)

    const channels = await Channel.findAll({
      include: [Message]
    })

    const data = JSON.stringify(channels)

    stream.updateInit(data)
    stream.send(data)

    response.send(channel)
  }
)

const port = process.env.PORT || 5000

app.listen(
  port,
  () => console.log(`Listening on :${port}`)
)
