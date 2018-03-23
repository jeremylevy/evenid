var assert = require('assert');

var IsInput = require('./isInput');

module.exports = function (resp) {
    var isInput = IsInput(resp.text);

    assert.ok(!!resp.text.match(/class="g-recaptcha hidden"/));

    // Recaptcha was loaded asynchronously
    //assert.ok(!!resp.text.match(new RegExp('src="https://www\\.google\\.com/recaptcha/api\\.js"')));
};