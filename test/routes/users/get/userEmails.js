var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var displayUserFieldUsedBy = require('../../../../testUtils/tests/displayUserFieldUsedBy');

var createEmail = require('../../../../testUtils/users/createEmail');

var isValidUserEmailList = require('../../../../testUtils/validators/isValidUserEmailList');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /users/:user_id/emails', function () {
    before(function () {
        makeARequest = function (userID, page, statusCode, request, cb) {
            var URI = '/users/' + userID + '/emails';

            if (page) {
                URI += '/page/' + page;
            }

            request
                .get(URI)
                .expect(statusCode, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
        };
    });

    // Given that emails are paginated
    // we not want email to be added
    // from previous tests
    beforeEach(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            done();
        });
    });

    it('redirects to login page when user is unlogged', function (done) {
        // We don't need to create user because redirect to login page
        // occurs before the deletion
        var userID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;
            var page = null;

            if (err) {
                return done(err);
            }

            makeARequest(userID, page, 302, request, function (err, resp) {
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

    it('displays error when invalid user ID', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var page = null;

        makeARequest(userID, page, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays emails when valid user ID', function (done) {
        async.auto({
            createEmail: function (cb) {
                createEmail(csrfToken, user.id, user.password, request, function (err, email) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, email);
                });
            },

            createEmail2: ['createEmail', function (cb) {
                createEmail(csrfToken, user.id, user.password, request, function (err, email) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, email);
                });
            }],

            checkEmails: ['createEmail', 'createEmail2', function (cb, results) {
                var email = results.createEmail;
                var email2 = results.createEmail2;

                var page = 1;

                makeARequest(user.id, page, 200, request, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    isValidUserEmailList(email, resp.text);

                    page = 2;

                    makeARequest(user.id, page, 200, request, function (err, resp) {
                        if (err) {
                            return cb(err);
                        }

                        isValidUserEmailList(email2, resp.text);

                        cb(null, resp);
                    });
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
                entity: 'emails',
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