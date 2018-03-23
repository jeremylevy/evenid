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

var invalidCode = '9bef2485410e9378bc9adfb3e32236af4f683fa2';

var makeARequest = null;

describe('GET /users/:user_id/emails/:email_id/validate/:code', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, emailID, code, statusCode, request, cb) {
                request
                    .get('/users/' + userID 
                         + '/emails/' + emailID 
                         + '/validate/' + code)
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

            if (err) {
                return done(err);
            }

            makeARequest(userID, emailID, invalidCode, 302, request, function (err, resp) {
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

    it('displays error when invalid user ID and email ID', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var emailID = mongoose.Types.ObjectId().toString();

        makeARequest(userID, emailID, invalidCode, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays error when invalid code', function (done) {
        createEmail(csrfToken, user.id, user.password, request, function (err, email) {
            if (err) {
                return cb(err);
            }

            makeARequest(user.id, email.id, invalidCode, 403, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(new RegExp('The link you have followed is '
                                                     + 'invalid or expired. Please retry.')));

                done();
            });
        }); 
    });

    it('displays successful notification when valid code', function (done) {
        async.auto({
            createEmail: function (cb) {
                createEmail(csrfToken, user.id, user.password, request, function (err, email) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, email);
                });
            },

            createEmailValidationRequest: ['createEmail', function (cb, results) {
                var email = results.createEmail;

                createEmailValidationRequest(csrfToken, user.id, email.id, request, function (err, code) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, code);
                });
            }]
        }, function (err, results) {
            var email = results && results.createEmail;
            var code = results && results.createEmailValidationRequest;

            if (err) {
                return done(err);
            }

            makeARequest(user.id, email.id, code, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    assert.ok(!!resp.text.match(/Your email has been successfully validated/));

                    done();
                });
            });
        });
    });
});