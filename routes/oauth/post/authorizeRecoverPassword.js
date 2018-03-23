var validateResetRequestQS = require('../middlewares/validateResetRequestQS');
var recoverPasswordPost = require('../../users/middlewares/recoverPasswordPost');

module.exports = function (app, express) {
    app.post('/oauth/authorize', 
             // `false`: needs code?
             validateResetRequestQS(false), 
             // `true`: used during oauth authorize?
             recoverPasswordPost(true));
};