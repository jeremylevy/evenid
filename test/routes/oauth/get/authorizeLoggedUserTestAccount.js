var querystring = require('querystring');
var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var updateOauthClient = require('../../../../testUtils/clients/update');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var getOauthTestAccount = require('../../../../testUtils/tests/getOauthTestAccount');

var isOauthTestAccountFormDisplayed = require('../../../../testUtils/validators/isOauthTestAccountFormDisplayed');
var IsInput = require('../../../../testUtils/validators/isInput');
var IsSelect = require('../../../../testUtils/validators/isSelect');

var beforeHookResp = null;
var request = null;
var csrfToken = null;
var client = null;
var redirectionURI = null;

var makeARequest = null;

describe('GET /oauth/authorize (Logged user) (Test account)', function () {
    before(function () {
        makeARequest = function (flow, cb) {
            var context = this;
            var query = null;

            query = {
                client_id: client.client_id.toString(),
                redirect_uri: redirectionURI.redirect_uri,
                state: 'foo',
                flow: flow
            };

            (context.request || request)
                .get('/oauth/authorize?' + querystring.stringify(query))
                .expect(200, function (err, res) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, res);
                });
        };
    });

    beforeEach(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            beforeHookResp = resp;
            request = resp.request;
            csrfToken = resp.csrfToken;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            done();
        });
    });

    it('displays test button with passed test account '
       + 'when oauth client authorize test accounts '
       + 'during registration flow', function (done) {

        getOauthTestAccount(beforeHookResp, function (err, testAccount) {
            if (err) {
                return done(err);
            }

            request.saveCookies(testAccount.resp);

            makeARequest('registration', function (err, resp) {
                if (err) {
                    return done(err);
                }

                // Make sure `test_account` input is not displayed
                testAccount.id = null;

                // `true`: displayed?
                isOauthTestAccountFormDisplayed(testAccount, resp, true);

                done();
            });
        });
    });

    it('does not display test button when oauth client '
       + 'does not authorize test accounts during '
       + 'registration flow', function (done) {

        updateOauthClient(csrfToken, client.id, {
            authorize_test_accounts: 'false'
        }, request, function (err, updatedClient) {
            if (err) {
                return done(err);
            }

            makeARequest('registration', function (err, resp) {
                if (err) {
                    return done(err);
                }

                // `null`: test account
                // `false`: displayed?
                isOauthTestAccountFormDisplayed(null, resp, false);

                done();
            });
        });
    });

    it('doesn\'t display test button when oauth client '
       + 'authorize test accounts but user was logged by client', function (done) {

        async.auto({
            updateOauthClient: function (cb) {
                updateOauthClient(csrfToken, client.id, {
                    authorize_test_accounts: 'true'
                }, request, function (err, updatedClient) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, updatedClient)
                });
            },

            getUnloggedRequest: function (cb) {
                getUnloggedRequest(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            loginOnClientForm: ['updateOauthClient', 'getUnloggedRequest', function (cb, results) {
                var request = results.getUnloggedRequest.request;
                var csrfToken = results.getUnloggedRequest.csrfToken;
                var query = {
                    client_id: client.client_id.toString(),
                    redirect_uri: redirectionURI.redirect_uri,
                    state: 'foo',
                    flow: 'registration'
                };

                request
                    .post('/oauth/authorize?' + querystring.stringify(query))
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .send({
                        email: mongoose.Types.ObjectId().toString() + '@evenid.com',
                        password: mongoose.Types.ObjectId().toString(),
                        _csrf: csrfToken
                    })
                    .expect(302, function (err, res) {
                        if (err) {
                            return cb(err);
                        }

                        cb(null, res);
                    });
            }]
        }, function (err, results) {
            var loginOnClientFormResp = results.loginOnClientForm;
            var request = results.getUnloggedRequest.request;

            if (err) {
                return done(err);
            }

            makeARequest.call({
                request: request
            }, 'registration', function (err, resp) {
                if (err) {
                    return done(err);
                }

                // `null`: test account
                // `false`: displayed?
                isOauthTestAccountFormDisplayed(null, resp, false);

                done();
            });
        });
    });
});