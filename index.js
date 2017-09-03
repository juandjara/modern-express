const express    = require('express');
const mongoose   = require('mongoose');
const helmet     = require('helmet');
const bodyParser = require('body-parser');
const morgan     = require('morgan');
const bluebird   = require('bluebird');
const jwt        = require('express-jwt');
const cors = require('cors')

const config = require('./config');
const routes = require('./routes');

const app  = express();

mongoose.Promise = bluebird;
mongoose.connect(config.mongo.url);

app.set('json spaces', 2);

app.use(cors());
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use('/swagger-ui', express.static('swagger-ui'))

const jwtWhitelist = ['/', '/user/login'];

app.use(jwt({secret: 'mega_token_secret'}).unless({path: jwtWhitelist}));
app.use('/', routes);

app.use((err, req, res, next) => {
  console.error(err)
  let status = err.status || 500
  if (err.isBoom) {
    status = err.output.statusCode
  }
  res.status(status)
     .json({name: err.name, status, error: err.message});
});

app.listen(config.server.port, () => {
  console.log(`Magic happens on port ${config.server.port}`);
});

module.exports = app;
