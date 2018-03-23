var assert = require('assert');
var Type = require('type-of-is');

var config = require('../../../config');

var isValidOauthToken = require('../../../libs/validators/isValidOauthToken');

module.exports = function (res, refreshToken) {
    assert.ok(res && res.cookie,
              'argument `res` must have a `cookie()` method');

    assert.ok(isValidOauthToken(refreshToken),
              'argument `refreshToken` is invalid');

    // 1: name, 2: value, 3: option. See the Express docs.
    res.cookie(config.EVENID_PERSISTENT_LOGIN_COOKIE.name, 
               refreshToken, 
               config.EVENID_PERSISTENT_LOGIN_COOKIE);
};