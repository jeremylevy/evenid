var config = require('../../../config');

var recoverPasswordCodePost = require('../middlewares/recoverPasswordCodePost');

module.exports = function (app, express) {
    var uriReg = new RegExp('/recover-password/(' 
                            + config.EVENID_USER_RESET_PASSWORD_REQUESTS
                                    .CODE
                                    .PATTERN 
                            + ')$');

    // `false`: used during oauth authorize?
    app.post(uriReg, recoverPasswordCodePost(false));
};