var recoverPasswordPost = require('../middlewares/recoverPasswordPost');

module.exports = function (app, express) {
    // `false`: used during oauth authorize?
    app.post('/recover-password', recoverPasswordPost(false));
};