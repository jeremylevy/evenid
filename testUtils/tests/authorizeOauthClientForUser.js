var assert = require('assert');
var querystring = require('querystring');

var async = require('async');

module.exports = function (beforeHookResp, cb) {
    var context = this;

    var request = beforeHookResp.request;
    var client = beforeHookResp.client;
    
    var redirectionURI = beforeHookResp.redirectionURI;
    var validFormData = beforeHookResp.validFormData();

    validFormData._csrf = beforeHookResp.csrfToken;

    async.auto({
        authorizeUser: function (cb) {
            var query = null;

            query = {
                client_id: client.client_id.toString(),
                redirect_uri: redirectionURI.redirect_uri,
                state: 'foo',
                flow: context.flow || 'registration'
            };

            request
                .post('/oauth/authorize?' + querystring.stringify(query))
                // Body parser middleware 
                // need it in order to 
                // populate `req.body`
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send(validFormData)
                .end(function (err, res) {
                    if (err) {
                        return cb(err);
                    }
                    
                    assert.ok(!!res.headers.location.match(redirectionURI.redirect_uri));

                    cb(null, res);
                });
        }
    }, function (err, results) {
        var authorizeUserResponse = results && results.authorizeUser;

        if (err) {
            return cb(err);
        }

        cb(null, {
            response: authorizeUserResponse, 
            formData: validFormData
        });
    });
};