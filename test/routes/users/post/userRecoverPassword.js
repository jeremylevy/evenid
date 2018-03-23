var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;
var makeASuccessfulRequest = function (email, done) {
    async.auto({
        createEmail: function (cb) {
            if (email) {
                return cb(null, email);
            }

            getLoggedRequest(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                cb(null, resp.user.email);
            });
        }
    }, function (err, results) {
        var email = results && results.createEmail;

        if (err) {
            return done(err);
        }

        makeARequest({
            email: email, 
            _csrf: csrfToken
        }, 302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            request.get(resp.headers.location)
                   .end(function (err, resp) {
                
                done(err, email, resp);
            });
        });
    });
};

describe('POST /recover-password', function () {
    before(function (done) {
        getUnloggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;

            makeARequest = function (data, statusCode, request, cb) {
                request
                    .post('/recover-password')
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

    it('redirects to user page when user is logged', function (done) {
        getLoggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;
            var user = resp.user;

            if (err) {
                return done(err);
            }

            makeARequest({
                email: resp.user.email, 
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/users/' + user.id);

                request.get('/users/' + user.id)
                       .end(function (err, resp) {
                    
                    assert.ok(!!resp.text.match(/You must log out to see this page/));

                    done();
                });
            });
        });
    });
    
    // Same than email not set.
    // See the routes.
    it('displays error when email is invalid', function (done) {
        makeARequest({
            email: 'bar',
            _csrf: csrfToken
        }, 302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location,
                               '/recover-password');

            request.get('/recover-password')
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/Your email address is invalid/));

                done();
            });
        });
    });

    it('displays error when email is not attached to an account', function (done) {
        var email = 'bar' 
                    + mongoose.Types.ObjectId().toString() 
                    + '@evenid.com';

        makeARequest({
            email: email,
            _csrf: csrfToken
        }, 302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location,
                               '/recover-password');

            request.get('/recover-password')
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/Your email address does not belong to any account/));

                done();
            });
        });
    });

    it('displays error when the maximum '
       + 'number of requests has been reached', function (done) {
        
        makeASuccessfulRequest(null, function (err, email, resp) {
            if (err) {
                return done(err);
            }

            // Make the same request twice to trigger error
            // Limits are set to one request per 24H per account
            // See API config
            makeASuccessfulRequest(email, function (err, email, resp) {
                var errorReg = new RegExp('You have reached the maximum number of '
                                        + 'password reset requests allowed per day.');

                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(errorReg));

                done();
            });
        });
    });

    it('displays successful notification when valid email', function (done) {
        makeASuccessfulRequest(null, function (err, email, resp) {
            var notifReg = new RegExp('An email containing a link to reset '
                                    + 'your password has just been sent '
                                    + 'to the address you provided.');
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(notifReg));

            done();
        });
    });
});