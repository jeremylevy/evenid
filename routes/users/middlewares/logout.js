var config = require('../../../config');

var clearPersistentLoginCookie = require('../callbacks/clearPersistentLoginCookie');

module.exports = function (req, res, next) {
    var redirectTo = req.body.redirect_to;
    
    var validRedirectURLReg = new RegExp(
        config.EVENID_LOGOUT_VALID_REDIRECT_URIS.join('|')
    );

    // Avoid open redirect
    if (!validRedirectURLReg.test(redirectTo)) {
        redirectTo = null;
    }

    req.session.login = {};

    clearPersistentLoginCookie(res);

    res.redirect(redirectTo || '/login');
};