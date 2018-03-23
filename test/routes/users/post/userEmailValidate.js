var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createEmail = require('../../../../testUtils/users/createEmail');
var createEmailValidationRequest = require('../../../../testUtils/users/createEmailValidationRequest');

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

            createEmail(csrfToken, user.id, user.password, 
                        request, function (err, email) {
                
                if (err) {
                    return cb(err);
                }

                cb(null, email);
            });
        }
    }, function (err, results) {
        var email = results && results.createEmail;

        if (err) {
            return done(err);
        }

        makeARequest(user.id, email.id, {
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

describe('POST /users/:user_id/emails/:email_id/validate', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, emailID, data, 
                                     statusCode, request, cb) {
                
                request
                    .post('/users/' + userID 
                        + '/emails/' + emailID 
                        + '/validate')
                    // Body parser middleware need 
                    // it in order to populate req.body
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

    it('redirects to login page when user is unlogged', function (done) {
        // We don't need to create user because redirect to login page
        // occurs before validation
        var userID = mongoose.Types.ObjectId().toString();
        var emailID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, emailID, {
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

                request.get('/login')
                       .end(function (err, resp) {

                    if (err) {
                        return done(err);
                    }
                    
                    assert.ok(!!resp.text.match(/You must log in to see this page/));

                    done();
                });
            });
        });
    });

    it('displays error when invalid user ID and email ID', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var emailID = mongoose.Types.ObjectId().toString();

        makeARequest(userID, emailID, {
            _csrf: csrfToken
        }, 302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location,
                               '/users/' + userID + '/emails');

            request.get(resp.headers.location)
                   .end(function (err, resp) {
                
                assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

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
            // Limits are set to one request per 24H per email
            // See API config
            makeASuccessfulRequest(email, function (err, email, resp) {
                var errorReg = new RegExp('You have reached the maximum number of '
                                        + 'email validate requests allowed per day.');

                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(errorReg));

                done();
            });
        });
    });

    it('displays successful notification '
       + 'when valid user and email ID', function (done) {
        
        makeASuccessfulRequest(null, function (err, email, resp) {
            var notifReg = new RegExp('An email containing a link to validate '
                                    + 'your email address has just been sent '
                                    + 'to the address you provided.');
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(notifReg));

            done();
        });
    });
});