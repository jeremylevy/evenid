var assert = require('assert');

module.exports = function (redirectionURI, resp) {
    assert.ok(!!resp.match(new RegExp(redirectionURI.id)));
    assert.ok(!!resp.match(new RegExp(redirectionURI.redirect_uri)));
    assert.ok(!!resp.match(new RegExp(redirectionURI.response_type)));
};

