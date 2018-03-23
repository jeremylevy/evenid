var isLoggedIn = require('../callbacks/isLoggedIn');

module.exports = function (app, express) {
    app.get('/user-redirect', function (req, res) {
        if (isLoggedIn(req)) {
            return res.redirect('/users/' + req.session.login.user.id);
        }

        res.redirect('/login');
    });
};