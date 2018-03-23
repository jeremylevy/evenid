var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /clients/:client_id/statistics/users', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, statusCode, request, cb) {
                var URL = '/clients/' 
                            + clientID 
                            + '/statistics/users';

                request
                    .get(URL)
                    .expect(statusCode, function (err, resp) {
                        if (err) {
                            return cb(err);
                        }

                        cb(null, resp);
                    });
            };

            done();
        });
    });

    it('redirects to login page when user is unlogged', function (done) {
        // We don't need to create client 
        // because redirect to login page
        // occurs before the deletion
        var clientID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

                request.get('/login').end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }
                    
                    assert.ok(!!resp.text.match(/You must log in to see this page/));

                    done();
                });
            });
        });
    });

    it('displays error when invalid client ID', function (done) {
        var clientID = mongoose.Types.ObjectId().toString();

        makeARequest(clientID, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays statistics when valid client ID', function (done) {
        // Events are not inserted 
        // for client owner so we will need 
        // to create another user
        var clientOwner = {
            request: null,
            user: null,
            csrfToken: null
        };

        async.auto({
            beforeHook: function (cb) {
                oauthAuthorizeBeforeHook(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            // Events are not inserted for client owner
            // so create another user
            getLoggedRequest: ['beforeHook', function (cb, results) {
                var beforeHookResp = results.beforeHook;

                getLoggedRequest(function (err, resp) {
                    if (err) {
                        return cb(error);
                    }

                    clientOwner.request = beforeHookResp.request;
                    clientOwner.user = beforeHookResp.user;
                    clientOwner.csrfToken = beforeHookResp.csrfToken;

                    beforeHookResp.request = resp.request;
                    beforeHookResp.user = resp.user;
                    beforeHookResp.csrfToken = resp.csrfToken;

                    cb(null);
                });
            }],

            // Registered user
            registerUser: ['getLoggedRequest', function (cb, results) {
                var resp = results.beforeHook;

                authorizeOauthClientForUser(resp, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            // Active user
            logUser: ['registerUser', function (cb, results) {
                var resp = results.beforeHook;

                authorizeOauthClientForUser.call({
                    flow: 'login'
                }, resp, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            var resp = results && results.beforeHook;
            var clientID = resp && resp.client.id;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, 200, clientOwner.request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                // Registered/Active users
                assert.strictEqual(resp.text.match(/<p>1<\/p>/g).length, 2);
                // Retention
                assert.strictEqual(resp.text.match(/<p>100%<\/p>/g).length, 1);

                done();
            });
        });
    });
});