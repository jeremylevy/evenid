var assert = require('assert');
var Type = require('type-of-is');

var isValidOauthToken = require('../../../libs/validators/isValidOauthToken');

module.exports = function (req, tokens) {
    assert.ok(req && req.session,
              'argument `req` must have a `session` property');

    assert.ok(Type.is(tokens, Object) 
              && isValidOauthToken(tokens.access_token)
              && isValidOauthToken(tokens.refresh_token),
              'argument `tokens` is invalid');

    req.session.unauthenticated_tokens = tokens;
};