var assert = require('assert');
var Type = require('type-of-is');

module.exports = ApiError;

function ApiError (type, messages) {
    assert.ok(Type.is(type, String) && type.length,
              'argument `type` is invalid');
    
    assert.ok(!messages || Type.is(messages, Object),
              'argument `messages` is invalid');
    
    // Never use `type` as error property
    // to avoid `Illegal access` error
    // See http://www.karadzhov.com/2014/06/nodejs-and-illegal-access-error.html
    this.kind = type;
    this.messages = messages || {};
}

ApiError.prototype = new Error();
ApiError.prototype.constructor = ApiError;