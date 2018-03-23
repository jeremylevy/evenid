var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var displayUserFieldUsedBy = require('../../../../testUtils/tests/displayUserFieldUsedBy');

var createEmail = require('../../../../testUtils/users/createEmail');

var isValidUserEmailPage = require('../../../../testUtils/validators/isValidUserEmailPage');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /users/:user_id/emails/:email_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, emailID, statusCode, request, cb) {
                request
                    .get('/users/' + userID + '/emails/' + emailID)
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
        // occurs before the deletion
        var userID = mongoose.Types.ObjectId().toString();
        var emailID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, emailID, 302, request, function (err, resp) {
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

        makeARequest(userID, emailID, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays email when valid user ID and email ID', function (done) {
        async.auto({
            createEmail: function (cb) {
                createEmail(csrfToken, user.id, user.password, request, function (err, email) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, email);
                });
            },

            checkEmail: ['createEmail', function (cb, results) {
                var email = results.createEmail;

                makeARequest(user.id, email.id, 200, request, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    isValidUserEmailPage(email, resp.text);

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            if (err) {
                return done(err);
            }

            done();
        });
    });

    it('displays `used by...` when user has authorized clients', function (done) {
        createEmail(csrfToken, user.id, user.password, request, function (err, email) {
            if (err) {
                return done(err);
            }

            displayUserFieldUsedBy.call({
                entity: 'email',
                formData: {
                    email: email.id
                },
                request: request,
                csrfToken: csrfToken,
                user: user
            }, makeARequest)(done);
        });
    });
});