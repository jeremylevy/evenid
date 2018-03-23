var assert = require('assert');

var IsInput = require('./isInput');

module.exports = function (email, resp) {
    var isInput = IsInput(resp);

    assert.ok(!!resp.match(new RegExp(email)));

    isInput('password', 'password', '');
};