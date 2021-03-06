import test from 'ava'
import request from 'supertest'
import MongodbMemoryServer from 'mongodb-memory-server'
import mongoose from 'mongoose'
import User from '../model/user/schema'

mongoose.Promise = global.Promise
process.env.NODE_ENV = 'test'
const app = require('../server')
const mongod = new MongodbMemoryServer()

const createTestUsers = async () => {
  const admin = new User({
    email: 'admin',
    password: 'admin',
    name: 'admin',
    roles: ["ADMIN"]
  })
  await admin.save()
  const dev = new User({
    email: 'dev',
    name: 'dev',
    password: 'dev',
    roles: ["DEVELOPER"]
  })
  await dev.save()
  const dev2 = new User({
    email: 'dev2',
    name: 'dev2',
    password: 'dev2',
    roles: ["DEVELOPER"]
  })
  await dev2.save()
}
const login = async (user, pass) => {
  const res = await request(app)
    .post('/user/authenticate')
    .send({email: user, password: pass})

  return {res, token: res.body.token}
}

test.before(async () => {
  const uri = await mongod.getConnectionString();
  await mongoose.connect(uri, {useMongoClient: true});
  await createTestUsers()
})
test.after(() => {
  mongod.stop()
  mongoose.disconnect()
})

const getMyself = async (token) => {
  const userRes = await request(app)
    .get('/user/me')
    .set('Authorization', `Bearer ${token}`)
  return userRes.body
}
const isValidISODateString = isoDateStr => !isNaN(Date.parse(isoDateStr))

test(
  'anonymous user should be able to login with email and password', 
  async t => {
    const {res, token} = await login('admin', 'admin')
    t.is(res.status, 200)
    t.is(typeof token, 'string')
  }
)
test(
  'logged user should be able to get his data',
  async t => {
    const {token} = await login('admin', 'admin')
    const user = await getMyself(token)

    t.is(user.email, 'admin')
    t.is(user.name, 'admin')
    t.true(Array.isArray(user.roles))
    t.is(user.roles[0], 'ADMIN')
    t.true(isValidISODateString(user.created_at))
    t.is(typeof user._id, 'string')
    t.falsy(user.password)
  }
)
test(
  'admin should be able to list all users',
  async t => {
    const {token} = await login('admin', 'admin')
    const res = await request(app)
      .get('/user')
      .set('Authorization', `Bearer ${token}`)

    t.is(res.status, 200)
    const users = res.body.docs
    t.true(Array.isArray(users))
    t.is(typeof users[0], 'object')

    t.is(users[0].email, 'admin')
    t.is(users[1].email, 'dev')
  }
)
test(
  'developer should be able to list all users',
  async t => {
    const {token} = await login('dev', 'dev')
    const res = await request(app)
      .get('/user')
      .set('Authorization', `Bearer ${token}`)

    t.is(res.status, 200)
    const users = res.body.docs
    t.true(Array.isArray(users))
    t.is(typeof users[0], 'object')

    t.is(users[0].email, 'admin')
    t.is(users[1].email, 'dev')
  }
)

test(
  'logged user should be able to modify his/her data',
  async t => {
    const {token} = await login('admin', 'admin')
    const initialUser = await getMyself(token)

    const res = await request(app)
      .put('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not admin' })

    t.is(res.status, 200)
    t.not(initialUser.email, res.body.email)
    t.is(res.body.email, 'not admin')
    t.falsy(res.body.password)
  }
)
test(
  'admin should be able to create a new user',
  async t => {
    const {token} = await login('admin', 'admin')
    const newUser = {
      email: 'user 3',
      password: 'user',
      repeat_password: 'user',
      name: 'user 3'
    }
    const res = await request(app)
      .post('/user')
      .set('Authorization', `Bearer ${token}`)
      .send(newUser)

    t.is(res.status, 201)

    const user = res.body
    t.is(typeof user, 'object')
    t.is(typeof user._id, 'string')
    t.is(user.email, newUser.email)
    t.is(user.name, newUser.name)
    t.true(isValidISODateString(user.created_at))
    t.falsy(user.password)
  }
)

test(
  'developer should not be able to create a new user',
  async t => {
    const {token} = await login('dev', 'dev')
    const newUser = {
      email: 'user 3',
      password: 'user 3',
      name: 'user 3'
    }
    const res = await request(app)
      .post('/user')
      .set('Authorization', `Bearer ${token}`)
      .send(newUser)

    t.is(res.status, 403)
    t.is(res.body.error, 'Permission denied')
  }
)

test(
  'admin should be able to get any user by id',
  async t => {
    const {token} = await login('admin', 'admin')
    const user = await User.find({email: 'dev'}).exec()

    const res = await request(app)
      .get(`/user/${user[0]._id}`)
      .set('Authorization', `Bearer ${token}`)

    t.is(res.status, 200)
    t.is(JSON.stringify(res.body), JSON.stringify(user[0]))
  }
)
test(
  'developer should be able to get any user by id',
  async t => {
    const {token} = await login('dev', 'dev')
    const user = await User.find({email: 'dev'}).exec()

    const res = await request(app)
      .get(`/user/${user[0]._id}`)
      .set('Authorization', `Bearer ${token}`)

    t.is(res.status, 200)
    t.is(res.body.email, 'dev')
  }
)

test(
  'admin should be able to edit any user by id',
  async t => {
    const {token} = await login('admin', 'admin')
    const user = await User.find({email: 'dev2'})
    const id = user[0]._id.toString()

    const res = await request(app)
      .put(`/user/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({name: 'edited'})

    t.is(res.status, 200)
    t.not(user.name, res.body.name)
    t.is(res.body.name, 'edited')
  }
)
test(
  'developer should not be able to edit any user by id',
  async t => {
    const {token} = await login('dev', 'dev')
    const user = await User.find({email: 'dev'}).exec()

    const res = await request(app)
      .put(`/user/${user[0]._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({name: 'dev edited'})

    t.is(res.status, 403)
    t.is(res.body.error, 'Permission denied')
  }
)

test(
  'admin should be able to delete any user by id',
  async t => {
    const {token} = await login('admin', 'admin')
    const user = await User.find({email: 'dev'}).exec()

    const res = await request(app)
      .delete(`/user/${user[0]._id}`)
      .set('Authorization', `Bearer ${token}`)

    t.is(res.status, 200)
  }
)
test(
  'developer should not be able to delete any user by id',
  async t => {
    const {token} = await login('dev', 'dev')
    const user = await User.find({email: 'dev'}).exec()

    const res = await request(app)
      .delete(`/user/${user[0]._id}`)
      .set('Authorization', `Bearer ${token}`)

    t.is(res.status, 403)
  }
)
