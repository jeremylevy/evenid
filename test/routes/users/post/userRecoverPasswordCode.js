var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createEmail = require('../../../../testUtils/users/createEmail');
var createRecoverPasswordRequest = require('../../../../testUtils/users/createRecoverPasswordRequest');

var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

var invalidCode = '9bef2485410e9378bc9adfb3e32236af4f683fa2';

var validFormData = function (user, csrfToken) {
    return  {
        email: user.email,
        password: 'barbar', 
        _csrf: csrfToken
    };
};

var uriReg = new RegExp('^/recover-password/(' 
                        + config.EVENID_USER_RESET_PASSWORD_REQUESTS
                                .CODE
                                .PATTERN
                        + ')$');

describe('POST /recover-password/:code', function () {
    before(function (done) {
        getUnloggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;

            // Just to get email
            getLoggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                user = resp.user;

                makeARequest = function (code, data, statusCode, request, cb) {
                    request
                        .post('/recover-password/' + code)
                        // Body parser middleware need it in order to populate req.body
                        .set('Content-Type', 'application/x-www-form-urlencoded')
                        .send(data)
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
    });

    it('redirects to user page when user is logged', function (done) {
        getLoggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;
            var user = resp.user;

            if (err) {
                return done(err);
            }

            makeARequest(invalidCode, validFormData(user, csrfToken),
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/users/' + user.id);

                request.get('/users/' + user.id)
                       .end(function (err, resp) {
                    
                    assert.ok(!!resp.text.match(/You must log out to see this page/));

                    done();
                });
            });
        });
    });

    it('displays error when code is invalid', function (done) {
        makeARequest(invalidCode, validFormData(user, csrfToken), 
                     302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(uriReg));

            request.get('/recover-password')
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(new RegExp('The link you have followed is '
                                                     + 'invalid or expired. Please retry.')));

                done();
            });
        });
    });
    
    // Same than password not set.
    // See the routes.
    it('displays error when password is invalid', function (done) {
        async.auto({
            createRecoverPasswordReq: function (cb, results) {
                createRecoverPasswordRequest(csrfToken, user.email, 
                                             request, function (err, code) {
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

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
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
            var formData = validFormData(user, csrfToken);

            if (err) {
                return done(err);
            }

            makeARequest(code, formData, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/users/' + user.id);

                request.get('/users/' + user.id)
                       .end(function (err, resp) {
                    
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