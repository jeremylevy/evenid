var assert = require('assert');
var Type = require('type-of-is');

var config = require('../../../config');

var setUserInSession = require('./setUserInSession');
var setPersistentLoginCookie = require('./setPersistentLoginCookie');

var isValidOauthToken = require('../../../libs/validators/isValidOauthToken');

module.exports = function (req, res, tokens, user, setPersistentLogin) {
    assert.ok(req && req.session,
            'argument `req` must have a `session` property');

    assert.ok(res && res.cookie,
            'argument `res` must have a `cookie()` method');

    if (setPersistentLogin) {
        assert.ok(tokens && isValidOauthToken(tokens.refresh_token),
                'argument `tokens` is invalid');
    }

    assert.ok(Type.is(setPersistentLogin, Boolean),
            'argument `setPersistentLogin` is invalid');

    req.session.login = tokens;

    setUserInSession(req, user);

    if (setPersistentLogin) {
        setPersistentLoginCookie(res, tokens.refresh_token);
    }
};