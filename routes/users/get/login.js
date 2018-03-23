var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    app.get('/login', checkIfUserIs('unlogged'), function (req, res) {
        res.render('users/login');
    });
};