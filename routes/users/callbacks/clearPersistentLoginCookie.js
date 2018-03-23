var assert = require('assert');

var config = require('../../../config');

module.exports = function (res) {
    assert.ok(res && res.clearCookie,
            'argument `res` must have a `clearCookie()` method');

    res.clearCookie(config.EVENID_PERSISTENT_LOGIN_COOKIE.name,
                    config.EVENID_PERSISTENT_LOGIN_COOKIE);
};