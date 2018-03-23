var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var IsInput = require('../../../../testUtils/validators/isInput');
var isCaptchaDisplayed = require('../../../../testUtils/validators/isCaptchaDisplayed');

var request = null;
var loggedRequest = null;
var csrfToken = null;
var loggedCsrfToken = null;
var user = null;

var makeARequest = null;

var validUserCredentials = function (csrfToken, user) {
    return {
        email: user.email,
        password: user.password,
        _csrf: csrfToken
    };
};

describe('POST /login', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            loggedRequest = resp.request;
            loggedCsrfToken = resp.csrfToken;
            user = resp.user;

            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;
                csrfToken = resp.csrfToken;

                makeARequest = function (data, statusCode, request, cb) {
                    request
                        .post('/login')
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
        makeARequest(validUserCredentials(loggedCsrfToken, user), 
                     302, loggedRequest, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location,
                               '/users/' + user.id);

            done();
        });
    });

    it('displays "email must be set" error '
       + 'when empty form data', function (done) {
        
        makeARequest({
            _csrf: csrfToken
        }, 302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/login');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/Your email address must be set\./));

                done();
            });
        });
    });

    it('displays invalid email error when '
       + 'invalid user email', function (done) {
        
        var userCredentials = validUserCredentials(csrfToken, user);

        userCredentials.email = mongoose.Types.ObjectId().toString() + ' @evenid.com';

        makeARequest(userCredentials, 302,
                     request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/login');

            request.get(resp.headers.location).end(function (err, resp) {
                var isInput = IsInput(resp.text);

                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/This email address does not exist./));

                // Make sure email field was not prefilled
                isInput('email', 'email', '');

                done();
            });
        });
    });

    it('displays "password must be set" error '
       + 'when empty password', function (done) {

        // Get another user to get ride 
        // of max attempts captcha error
        getLoggedRequest(function (err, resp) {
            var user = resp && resp.user;
            var userCredentials = resp && validUserCredentials(csrfToken, user);

            if (err) {
                return done(err);
            }

            userCredentials.password = '';
            
            makeARequest(userCredentials, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    assert.ok(!!resp.text.match(/Your password must be set\./));

                    done();
                });
            });
        });
    });

    it('displays invalid password error when '
       + 'invalid user password', function (done) {
        
        getLoggedRequest(function (err, resp) {
            var user = resp && resp.user;
            var userCredentials = resp && validUserCredentials(csrfToken, user);

            if (err) {
                return done(err);
            }

            userCredentials.password = mongoose.Types.ObjectId().toString();

            makeARequest(userCredentials, 302,
                         request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

                request.get(resp.headers.location).end(function (err, resp) {
                    var isInput = IsInput(resp.text);

                    if (err) {
                        return done(err);
                    }
                    
                    assert.ok(!!resp.text.match(/Your password is invalid\./));

                    // Make sure email field was prefilled
                    isInput('email', 'email', user.email);

                    done();
                });
            });
        });
    });

    it('display captcha when invalid credentials '
       + 'attempts exceed limit', function (done) {
        
        async.auto({
            createUser: function (cb) {
                getLoggedRequest(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp.user);
                });
            },

            makeInvalidRequests: ['createUser', function (cb, results) {
                var user = results.createUser;
                var userCredentials = validUserCredentials(csrfToken, user);

                // Set wrong password
                userCredentials.password = mongoose.Types.ObjectId();

                // In test env, limit is set to one request per 24h
                // So make the same request twice
                makeARequest(userCredentials, 302, request, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    makeARequest(userCredentials, 302, request, function (err, resp) {
                        if (err) {
                            return cb(err);
                        }

                        assert.strictEqual(resp.headers.location, '/login');

                        request.get(resp.headers.location).end(function (err, resp) {
                            var isInput = IsInput(resp.text);

                            if (err) {
                                return cb(err);
                            }

                            cb(null, resp);
                        });
                    });
                });
            }]
        }, function (err, results) {
            var makeInvalidRequestsResp = results && results.makeInvalidRequests;

            if (err) {
                return done(err);
            }

            isCaptchaDisplayed(makeInvalidRequestsResp);

            done();
        });
    });

    it('redirects to user page when valid credentials', function (done) {
        // Get another user to get ride 
        // of max attempts captcha error
        getLoggedRequest(function (err, resp) {
            var user = resp && resp.user;
            var userCredentials = resp && validUserCredentials(csrfToken, user);

            if (err) {
                return done(err);
            }

            makeARequest(userCredentials, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/users/' + user.id);

                done();
            });
        });
    });
});