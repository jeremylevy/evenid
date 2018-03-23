var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    app.get('/register', checkIfUserIs('unlogged'), function (req, res) {
        res.render('users/register');
    });
};