'use strict';

const express     = require('express');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const session     = require('express-session');
const mongo       = require('mongodb').MongoClient;
const passport    = require('passport');
const ObjectID    = require("mongodb").ObjectID;
const GitHubStrategy = require('passport-github').Strategy;

const routes = require('./routes');
const auth = require('./auth');

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const passportSocketIo = require('passport.socketio');
const MongoStore = require('connect-mongo')(session);
const cookieParser = require('cookie-parser');

fccTesting(app); //For FCC testing purposes

process.env.SESSION_SECRET = 123;
process.env.DATABASE="mongodb+srv://toy:hjptnrf1@toycluster-qew6l.mongodb.net/infoSec?retryWrites=true&w=majority";

process.env.GITHUB_CLIENT_ID = '55807dce8addb7526396';
process.env.GITHUB_CLIENT_SECRET = 'caab29d5897b7937f22c7a467ddf04d245d0d6c6';

const URI = process.env.DATABASE;
const store = new MongoStore({ url: URI });

app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'pug');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid',
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

mongo.connect(process.env.DATABASE, (err, client) => {
    if(err) {
        console.log('Database error: ' + err);
    } else {
        const db = client.db('infoSec');
        console.log('Successful database connection');
                 
        auth(app, db);
        routes(app, db);

        app.use((req, res, next) => {
          res.status(404)
            .type('text')
            .send('Not Found');
        });

        let currentUsers = 0;
      
        io.on('connection', socket => {
          ++currentUsers;
          io.emit('user', {
            name: socket.request.user.name,
            currentUsers,
            connected: true
          });
          socket.on('chat message', (message) => {
            io.emit('chat message', { name: socket.request.user.name, message });
          });
          console.log('A user has connected');
          
          socket.on('disconnect', () => {
            console.log('A user has disconnected');
            --currentUsers;
            io.emit('user', {
              name: socket.request.user.name,
              currentUsers,
              connected: false
            });
          });
        });          
}});


function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

http.listen(process.env.PORT || 3000, () => {
  console.log("Listening on port " + process.env.PORT);
});

