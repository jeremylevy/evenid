var validateResetRequestQS = require('../middlewares/validateResetRequestQS');
var recoverPasswordGet = require('../../users/middlewares/recoverPasswordGet');

module.exports = function (app, express) {
    app.get('/oauth/authorize', 
            // `false`: needs code?
            validateResetRequestQS(false), 
            // `true`: used during oauth authorize?
            recoverPasswordGet(true));
};