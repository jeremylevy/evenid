var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');

var getOauthTestAccount = require('../../../../testUtils/tests/getOauthTestAccount');
var convertOauthTestAccount = require('../../../../testUtils/tests/convertOauthTestAccount');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /clients/:client_id/statistics/test-accounts', function () {
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
                            + '/statistics/test-accounts';

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

            // User use test account for the first time
            getOauthTestAccount: ['beforeHook', function (cb, results) {
                var resp = results.beforeHook;

                getOauthTestAccount(resp, function (err, testAccount) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, testAccount);
                });
            }],

            // Converted user
            convertOauthTestAccount: ['getOauthTestAccount', function (cb, results) {
                var resp = results.beforeHook;
                var testAccount = results.getOauthTestAccount;

                convertOauthTestAccount(resp, testAccount.id, function (err, resp) {
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

            makeARequest(clientID, 200, resp.request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                // Registered & Converted
                assert.strictEqual(resp.text.match(/<p class="text-success">1<\/p>/g).length, 2);

                // Registered & Converted
                assert.strictEqual(resp.text.match(/<strong class="text-success">1 more than yesterday<\/strong>/g).length, 2);

                done();
            });
        });
    });
});