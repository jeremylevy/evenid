var assert = require('assert');
var querystring = require('querystring');

var async = require('async');

var getLoggedRequest = require('../../../testUtils/getLoggedRequest');

var oauthAuthorizeBeforeHook = require('../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../testUtils/tests/authorizeOauthClientForUser');

var makeARequest = null;

var testRecoverPasswordFlowRedirect = function (expectedFlow, cb) {
    async.auto({
        getLoggedRequest: function (cb) {
            oauthAuthorizeBeforeHook(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                cb(null, resp);
            });
        },

        // If user has authorized client
        // user will be redirected to login flow
        authorizeUser: ['getLoggedRequest', function (cb, results) {
            var resp = results.getLoggedRequest;

            if (expectedFlow !== 'login') {
                return cb(null);
            }

            authorizeOauthClientForUser(resp, function (err, resp) {
                if (err) {
                    return cb(err);
                }

                cb(null, resp);
            });
        }],

        // We access the recover 
        // password page while logged
        getUnloggedPage: ['authorizeUser', function (cb, results) {
            var resp = results.getLoggedRequest;

            var request = resp.request;
            var user = resp.user;
            
            var client = resp.client;
            var redirectionURI = resp.redirectionURI;

            var query = {
                client_id: client.client_id.toString(),
                redirect_uri: redirectionURI.redirect_uri,
                state: 'foo',
                flow: 'recover_password'
            };

            var URI = '/oauth/authorize?'
                    + querystring.stringify(query);

            // Make sure we are redirected
            // to expected flow
            makeARequest(URI, request, 302, function (err, resp) {
                if (err) {
                    return cb(err);
                }

                query.flow = expectedFlow;

                assert.strictEqual(resp.headers.location,
                                   '/oauth/authorize?'
                                    + querystring.stringify(query));

                cb(null, resp);
            });
        }],

        // Make sure notification was displayed
        getFlowPage: ['getUnloggedPage', function (cb, results) {
            var request = results.getLoggedRequest.request;
            var URI = results.getUnloggedPage.headers.location;

            request.get(URI)
                   .end(function (err, resp) {
                
                if (err) {
                    return cb(err);
                }

                assert.ok(!!resp.text.match(/You must log out to see this page\./));

                cb();
            });
        }]
    }, function (err, results) {
        if (err) {
            return cb(err);
        }

        cb();
    });
};

describe('ALL / Check if user is unlogged', function () {
    before(function () {
        makeARequest = function (URI, request, statusCode, cb) {
            request
                .get(URI)
                .expect(statusCode, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
        };
    });

    it('redirects to user profil when trying '
       + 'to access unlogged-restricted page', function (done) {

        var unloggedPage = '/register';

        async.auto({
            getLoggedRequest: function (cb) {
                getLoggedRequest(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            // We access the registration 
            // page while logged
            getUnloggedPage: ['getLoggedRequest', function (cb, results) {
                var resp = results.getLoggedRequest;

                var request = resp.request;
                var user = resp.user;

                // Make sure we are redirected
                // to user profil
                makeARequest(unloggedPage, request, 302, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    assert.strictEqual(resp.headers.location,
                                       '/users/' + user.id);

                    cb(null, resp);
                });
            }],

            // Make sure notification was displayed
            getUserProfil: ['getUnloggedPage', function (cb, results) {
                var resp = results.getLoggedRequest;
                
                var request = resp.request;
                var user = resp.user;

                request.get('/users/' + user.id)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(!!resp.text.match(/You must log out to see this page\./));

                    cb();
                });
            }]
        }, function (err, results) {
            if (err) {
                return done(err);
            }

            done();
        });
    });
    
    it('redirects to oauth authorize registration '
       + 'flow when trying to access recover password '
       + 'flow of unauthorized client', function (done) {

        testRecoverPasswordFlowRedirect('registration', done);
    });

    it('redirects to oauth authorize login flow '
       + 'when trying to access recover password '
       + 'flow of authorized client', function (done) {

        testRecoverPasswordFlowRedirect('login', done);
    });
});