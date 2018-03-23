var checkIfUserIs = require('../middlewares/checkIfUserIs');
var login = require('../middlewares/login');

module.exports = function (app, express) {
    app.post('/login', checkIfUserIs('unlogged'), login);
};