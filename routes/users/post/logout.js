var checkIfUserIs = require('../middlewares/checkIfUserIs');
var logout = require('../middlewares/logout');

module.exports = function (app, express) {
    app.post('/logout', checkIfUserIs('logged'), logout);
};