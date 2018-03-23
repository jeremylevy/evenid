var recoverPasswordGet = require('../middlewares/recoverPasswordGet');

module.exports = function (app, express) {
    // `false`: used during oauth authorize?
    app.get('/recover-password', recoverPasswordGet(false));
};