// var express = require('express')
//   , passport = require('passport')
//   , util = require('util')
//   , wsfedsaml2 = require('../../lib/passport-wsfed-saml2/index').Strategy
//   , fs = require('fs');

var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , wsfedsaml2 = require('passport-wsfed-saml2').Strategy
  , fs = require('fs')
  , morgan = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , session = require('express-session');

var users = [
    { id: 1, givenName: 'ivan', email: 'ivanov@kaiten091018.com' }
  , { id: 2, givenName: 'petr', email: 'petrov@kaiten091018.com' }
];

const port = process.env.PORT || 3000;

function findByEmail(email, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.email === email) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.email);
});

passport.deserializeUser(function(id, done) {
  findByEmail(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new wsfedsaml2(
  {
    path: '/login/callback',
    realm: 'urn:node:app',
    homeRealm: '', // specify an identity provider to avoid showing the idp selector
    identityProviderUrl: 'https://kaiten.infoworker.ru/adfs/ls',
    // setup either a certificate base64 encoded (cer) or just the thumbprint of the certificate if public key is embedded in the signature

    cert: 'MIIC5DCCAcygAwIBAgIQZOKuPnrIQJVBDYmvBixRVTANBgkqhkiG9w0BAQsFADAuMSwwKgYDVQQDEyNBREZTIFNpZ25pbmcgLSBrYWl0ZW4uaW5mb3dvcmtlci5ydTAeFw0xODA5MTYxNDExNTVaFw0xOTA5MTYxNDExNTVaMC4xLDAqBgNVBAMTI0FERlMgU2lnbmluZyAtIGthaXRlbi5pbmZvd29ya2VyLnJ1MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxHlnKNPybV5oFXEEWR48yhO5vZ/JHLEyVBCZQm6paxrZpLHyLplpKLl1UvESzFKzWLjvjFHeG8mcvmnfh8l+17QX5+1II6J9ePeao4kVPVIIEiBRXjhig8N3xO/mKUt4KvcI0KxwO8a4cRccIIkpKu92nMzK867Kk+5Q5WNLOk6rqUSdLu8jFo2KclLdMh4Q5k6ZpyCXRB3FLsnSH4SlcualMXWrkuuHtk5Cf6z+WE8gKE67hfMk/ahJ+qKaLTAsnOsiY0hBFv0u/ZPn9cU5cyhskdz1fvpvQjUCzHo4CRvlDfN49bES3RcIsy+IgGqvmOIqxqXmvWX7Mj0Ezm2ojQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQBMkNJVnLUPU6Tpo+7Bb30Cc3e/jBcqKJC5IkzXUWRZ74BT5vATePuuESyVXawMUNhE/ppuFiTeRNxEjBMGRxm+qPt5Nvy4Sm6zZLBNMNEmUo2Ja6AY5xczZJ1rYIzAPvGke8hysMBQVi2McN0+pe3N25357eWHAlshmT0lLIePz2Deyc98oUD7T5fiFbWhOZ2GqeoRkTxZL3n4owfFCALS6GplNna3PJj8oCZNSFC/MXghcOBsjOCKjvHOgeVOvrUv918s0tYI/zTY9rQyJrrsKaiXx9z1iaSPJaQUK9+TRPXheKcV3Ulw5kEDWDkzF7E38LOgV/aT1kjzHEBHH5PR'
    //thumbprints: ['b09e43c2e62d7d9707c58d948ba795e50ef402ab']
  },
  function(profile, done) {
    console.log("Auth with", profile);
    if (!profile.email) {
      return done(new Error("No email found"), null);
    }
    // asynchronous verification, for effect...
    process.nextTick(function () {
      findByEmail(profile.email, function(err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          // "Auto-registration"
          users.push(profile);
          return done(null, profile);
        }
        return done(null, user);
      })
    });
  }
));

var app = express();
var router = express.Router();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(morgan('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(methodOverride());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
 saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('', router);
app.use(express.static(__dirname + '/../../public'));


app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login',
  passport.authenticate('wsfed-saml2', { failureRedirect: '/', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  }
);

app.post('/login/callback', (req, res, next) => {
  console.log(req.body);
  next();
});

app.post('/login/callback',
  passport.authenticate('wsfed-saml2', { failureRedirect: '/', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(port, function () {
  console.log(`Server listening in http://localhost:${port}`);
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
