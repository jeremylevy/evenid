var assert = require('assert');
var regexQuote = require('regexp-quote');

module.exports = function (address, resp) {
    /* Make sure address is displayed */
    Object.keys(address).forEach(function (addressKey) {
        var reg = new RegExp(regexQuote(address[addressKey]));

        if (['_csrf'].indexOf(addressKey) !== -1) {
            return;
        }

        assert.ok(!!resp.match(reg));
    });
};