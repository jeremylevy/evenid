var assert = require('assert');

var querystring = require('querystring');
var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');
var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');

var createRecoverPasswordRequest = require('../../../../testUtils/users/createRecoverPasswordRequest');

var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var beforeHookResp = null;
var loggedRequest = null;
var request = null;
var loggedRequestCsrfToken = null;
var csrfToken = null;
var user = null;
var client = null;
var redirectionURI = null;

var makeARequest = null;

var invalidCode = '9bef2485410e9378bc9adfb3e32236af4f683fa2';
var uriReg = new RegExp('/oauth/authorize');
var validFormData = function (user, csrfToken) {
    return  {
        email: user.email,
        password: 'barbar', 
        _csrf: csrfToken
    };
};

describe('POST /oauth/authorize (Recover password) (Code)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            beforeHookResp = resp;
            loggedRequest = resp.request;
            loggedRequestCsrfToken = resp.csrfToken;
            user = resp.user;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;
                csrfToken = resp.csrfToken;

                makeARequest = function (code, data, statusCode, request, cb) {
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
                        .post('/oauth/authorize?' + querystring.stringify(query))
                        // Body parser middleware need it in order to populate req.body
                        .set('Content-Type', 'application/x-www-form-urlencoded')
                        .send(data)
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
    
    it('displays registration form when user '
       + 'is logged and has not authorized client', function (done) {
        
        makeARequest(invalidCode, 
                     validFormData(user, loggedRequestCsrfToken), 
                     302, loggedRequest, function (err, resp) {
            
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

    it('displays error when code is invalid', function (done) {
        makeARequest(invalidCode, 
                     validFormData(user, csrfToken), 
                     302, request, function (err, resp) {

            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(uriReg));

            // Redirect to /oauth/authorize with code
            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                // Redirect to /oauth/authorize without code
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
    });

    // Same than password not set.
    // See the routes.
    it('displays error when password is invalid', function (done) {
        async.auto({
            createRecoverPasswordReq: function (cb, results) {
                createRecoverPasswordRequest(csrfToken, user.email, request, function (err, code) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, code);
                });
            }
        }, function (err, results) {
            var code = results && results.createRecoverPasswordReq;

            var formData = validFormData(user, csrfToken);

            formData.password = 'bar';

            if (err) {
                return done(err);
            }

            makeARequest(code, formData, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.headers.location.match(uriReg));

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);
                    
                    assert.ok(!!resp.text.match(/Your password must be at least [0-9]+ characters/));

                    done();
                });
            });
        });
    });

    it('displays successful notification when valid password', function (done) {
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
                var user = loggedRequest.user;

                createRecoverPasswordRequest(csrfToken, 
                                             user.email, 
                                             request, 
                                             function (err, code) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, code);
                });
            }]
        }, function (err, results) {
            var code = results && results.createRecoverPasswordReq;
            var user = results && results.getLoggedRequest.user;
            var formData = validFormData(user, csrfToken);

            if (err) {
                return done(err);
            }

            makeARequest(code, formData, 302, request, function (err, resp) {
                var locationReg = new RegExp('/oauth/authorize(?=.*flow=registration)');
                
                if (err) {
                    return done(err);
                }
                
                assert.ok(!!resp.headers.location.match(locationReg));

                request.get(resp.headers.location).end(function (err, resp) {
                    var notifReg = new RegExp('Your password has been updated');
                    
                    if (err) {
                        return done(err);
                    }

                    assert.ok(!!resp.text.match(notifReg));

                    done();
                });
            });
        });
    });
});