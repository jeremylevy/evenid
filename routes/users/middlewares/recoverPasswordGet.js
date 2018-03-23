var checkIfUserIs = require('./checkIfUserIs');

module.exports = function (usedDuringOauthAuth) {
    return [checkIfUserIs('unlogged'), function (req, res, next) {
        var locals = {};

        // Prefill email field
        // Set during failed logins
        if (req.session.recoverPassword) {
            locals.email = {
                email : req.session.recoverPassword.email 
            };
        }

        //delete req.session.recoverPassword;

        res.render(usedDuringOauthAuth 
                   ? 'oauth/authorize/recoverPassword' 
                   : 'users/recoverPassword', locals);
    }];
};