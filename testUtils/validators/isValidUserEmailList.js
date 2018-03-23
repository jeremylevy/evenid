var assert = require('assert');
var regexQuote = require('regexp-quote');

module.exports = function (email, resp) {
    /* Make sure email is displayed */
    Object.keys(email).forEach(function (emailKey) {
        var reg = new RegExp(regexQuote(email[emailKey]));

        if (['_csrf', 'password'].indexOf(emailKey) !== -1) {
            return;
        }
        
        assert.ok(!!resp.match(reg));
    });
};