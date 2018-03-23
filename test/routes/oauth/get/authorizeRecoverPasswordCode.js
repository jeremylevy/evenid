var assert = require('assert');

var querystring = require('querystring');
var async = require('async');

var config = require('../../../../config');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');
var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var createRecoverPasswordRequest = require('../../../../testUtils/users/createRecoverPasswordRequest');

var isValidRecoverPasswordCodePage = require('../../../../testUtils/validators/isValidRecoverPasswordCodePage');

var beforeHookResp = null;
var loggedRequest = null;
var request = null;
var csrfToken = null;
var user = null;
var client = null;
var redirectionURI = null;

var makeARequest = null;

var invalidCode = '9bef2485410e9378bc9adfb3e32236af4f683fa2';

describe('GET /oauth/authorize (Recover password) (Code)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            beforeHookResp = resp;
            loggedRequest = resp.request;
            user = resp.user;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;
                csrfToken = resp.csrfToken;

                makeARequest = function (code, statusCode, request, cb) {
                    var context = this;
                    var query = null;

                    if (err) {
                        return done(err);
                    }

                    query = {
                        client_id: client.client_id.toString(),
                        redirect_uri: redirectionURI.redirect_uri,
                        state: 'foo',
                        flow: 'recover_password',
                        code: code
                    };

                    request
                        .get('/oauth/authorize?' + querystring.stringify(query))
                        .expect(statusCode, function (err, res) {
                            if (err) {
                                return cb(err);
                            }

                            cb(null, res);
                        });
                };

                done();
            });
        });
    });
    
    it('redirects to registration flow when user '
       + 'is logged and hasn\'t authorized client', function (done) {
        
        createRecoverPasswordRequest(csrfToken, user.email, request, function (err, code) {
            if (err) {
                return done(err);
            }

            makeARequest(code, 302, loggedRequest, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.headers.location.match(/flow=registration/));

                loggedRequest.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(!!resp.text.match(/You must log out to see this page/));

                    done();
                });
            });
        });
    });

    it('redirects to login flow when user is '
       + 'logged and has authorized client', function (done) {
        
        async.auto({
            // Get new user with new email in order to bypass
            // max attempts security which was set to 1 recover password by 24H in order
            // to enable testing of max attempts error in userRecoverPassword POST test
            getLoggedRequest: function (cb) {
                getLoggedRequest(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            createRecoverPasswordReq: ['getLoggedRequest', function (cb, results) {
                var loggedRequestResp = results.getLoggedRequest;

                // Request MUST be unlogged in order to create recover password request
                // So make sure using global var here, not the one created during `getLoggedRequest`
                // action
                createRecoverPasswordRequest(csrfToken, 
                                             loggedRequestResp.user.email, 
                                             request, function (err, code) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, code);
                });
            }],

            authorizeOauthClientForUser: ['createRecoverPasswordReq', function (cb, results) {
                var getLoggedRequestResp = results.getLoggedRequest;
                var oldRequest = beforeHookResp.request;
                var oldCSRFToken = beforeHookResp.csrfToken;
                var oldUser = beforeHookResp.user;

                // Make sure user match the one created when creating logged request
                beforeHookResp.request = getLoggedRequestResp.request;
                beforeHookResp.csrfToken = getLoggedRequestResp.csrfToken;
                beforeHookResp.user = getLoggedRequestResp.user;

                authorizeOauthClientForUser(beforeHookResp, function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    // Back to original values
                    beforeHookResp.request = oldRequest;
                    beforeHookResp.csrfToken = oldCSRFToken;
                    beforeHookResp.user = oldUser;

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            var loggedRequestResp = results && results.getLoggedRequest;
            var code = results && results.createRecoverPasswordReq;
            var request = loggedRequestResp.request;

            if (err) {
                return done(err);
            }

            makeARequest(code, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.headers.location.match(/flow=login/));

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(!!resp.text.match(/You must log out to see this page/));

                    done();
                });
            });
        });
    });

    it('displays error when code is invalid', function (done) {
        makeARequest(invalidCode, 302, request, function (err, resp) {
            var codeReg = new RegExp('/oauth/authorize(?!.*code=' 
                                     + config.EVENID_USER_RESET_PASSWORD_REQUESTS
                                             .CODE
                                             .PATTERN
                                     + ')');
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(codeReg));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                assert.ok(!!resp.text.match(new RegExp('The link you have followed is '
                                                     + 'invalid or expired. Please retry.')));

                done();
            });
        });
    });

    it('displays recover password form '
       + 'with prefilled email and password', function (done) {
        
        async.auto({
            // Get new user with new email in order to bypass
            // max attempts security which was set to 1 recover password by 24H in order
            // to enable testing of max attempts error in userRecoverPassword POST test
            getLoggedRequest: function (cb) {
                getLoggedRequest(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            createRecoverPasswordReq: ['getLoggedRequest', function (cb, results) {
                var loggedRequest = results.getLoggedRequest;

                createRecoverPasswordRequest(csrfToken, 
                                             loggedRequest.user.email, 
                                             request, function (err, code) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, code);
                });
            }]
        }, function (err, results) {
            var loggedRequest = results.getLoggedRequest;
            var code = results && results.createRecoverPasswordReq;
            var user = loggedRequest.user;

            if (err) {
                return done(err);
            }

            makeARequest(code, 200, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                isValidRecoverPasswordCodePage(user.email, resp.text);

                done();
            });
        });
    });
});