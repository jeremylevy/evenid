var config = require('../../../config');

var recoverPasswordCodeGet = require('../middlewares/recoverPasswordCodeGet');

module.exports = function (app, express) {
    var uriReg = new RegExp('/recover-password/(' 
                            + config.EVENID_USER_RESET_PASSWORD_REQUESTS
                                    .CODE
                                    .PATTERN 
                            + ')$');

    // `false`: used during oauth authorize?
    app.get(uriReg, recoverPasswordCodeGet(false));
};