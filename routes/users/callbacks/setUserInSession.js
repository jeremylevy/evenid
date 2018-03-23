var assert = require('assert');
var Type = require('type-of-is');

module.exports = function (req, user) {
    assert.ok(req && req.session && Type.is(req.session.login, Object),
              'argument `req` must have a `session.login` property');

    req.session.login.user = user;
};