const passport = require('passport');

module.exports = function(app, db) {
  
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
  };
  
  app.route('/auth/github').get(passport.authenticate('github'));

  app.route('/auth/github/callback').get(passport.authenticate('github', { failureRedirect: '/' }), (req,res) => { 
        req.session.user_id = req.user.id;
        res.redirect('/chat'); 
        //res.redirect('/profile');
  });
  
  app.route('/')
    .get((req, res) => {
      res.render(process.cwd() + '/views/pug/index', { showRegistration: true, showSocialAuth: true });
    });

  app.route('/profile')
    .get(ensureAuthenticated, (req, res) => {
         res.render(process.cwd() + '/views/pug/profile', {user: req.user});
    });
  
  app.route('/chat')
    .get(ensureAuthenticated, (req, res) => {
         res.render(process.cwd() + '/views/pug/chat', {user: req.user});
    });

  app.route('/logout')
    .get((req, res) => {
        req.logout();
        res.redirect('/');
    });
}


