var assert = require('assert');

module.exports = function (resp) {
    assert.ok(!!resp.match(/This form contains invalid fields/));
};