var validateResetRequestQS = require('../middlewares/validateResetRequestQS');
var recoverPasswordCodeGet = require('../../users/middlewares/recoverPasswordCodeGet');

module.exports = function (app, express) {
    app.get('/oauth/authorize',
            // `true`: needs code?
            validateResetRequestQS(true), 
            // `true`: used during oauth authorize?
            recoverPasswordCodeGet(true));
};