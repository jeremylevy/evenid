var assert = require('assert');
var regexQuote = require('regexp-quote');

module.exports = function (notificationHandler, resp) {
    /* Make sure notification handler is displayed */
    Object.keys(notificationHandler).forEach(function (notificationHandlerKey) {
        var reg = new RegExp(regexQuote(notificationHandler[notificationHandlerKey]));

        if (['_csrf'].indexOf(notificationHandlerKey) !== -1) {
            return;
        }

        assert.ok(!!resp.match(reg));
    });
};