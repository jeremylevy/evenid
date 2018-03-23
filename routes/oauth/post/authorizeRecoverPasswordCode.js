var validateResetRequestQS = require('../middlewares/validateResetRequestQS');
var recoverPasswordCodePost = require('../../users/middlewares/recoverPasswordCodePost');

module.exports = function (app, express) {
    app.post('/oauth/authorize', 
             // `true`: needs code?
             validateResetRequestQS(true), 
             // `true`: used during oauth authorize?
             recoverPasswordCodePost(true));
};