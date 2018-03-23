var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var displayUserFieldUsedBy = require('../../../../testUtils/tests/displayUserFieldUsedBy');

var createPhoneNumber = require('../../../../testUtils/users/createPhoneNumber');

var isValidUserPhoneNumberList = require('../../../../testUtils/validators/isValidUserPhoneNumberList');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /users/:user_id/phone-numbers', function () {
    before(function () {
        makeARequest = function (userID, statusCode, request, cb) {
            request
                .get('/users/' + userID + '/phone-numbers')
                .expect(statusCode, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
        };
    });

    // Given that phone numbers are paginated
    // we not want phone number to be added
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

            if (err) {
                return done(err);
            }

            makeARequest(userID, 302, request, function (err, resp) {
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

        makeARequest(userID, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays phone numbers when valid user ID', function (done) {
        async.auto({
            createPhoneNumber: function (cb) {
                createPhoneNumber(csrfToken, user.id, request, function (err, phoneNumber) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, phoneNumber);
                });
            },

            createPhoneNumber2: function (cb) {
                createPhoneNumber(csrfToken, user.id, request, function (err, phoneNumber) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, phoneNumber);
                });
            },

            checkPhoneNumbers: ['createPhoneNumber', 'createPhoneNumber2', function (cb, results) {
                var phoneNumber = results.createPhoneNumber;
                var phoneNumber2 = results.createPhoneNumber2;
                var phoneNumbers = [phoneNumber, phoneNumber2];

                makeARequest(user.id, 200, request, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    // Make sure user's phone numbers page
                    // display all phoneNumber
                    phoneNumbers.forEach(function (phoneNumber) {
                        isValidUserPhoneNumberList(phoneNumber, resp.text);
                    });

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
        async.auto({
            createMobilePhoneNumber: function (cb) {
                createPhoneNumber.call({
                    phoneType: 'mobile'
                }, csrfToken, user.id, request, function (err, mobilePhoneNumber) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, mobilePhoneNumber);
                });
            },

            // Make sure phone numbers are created one after another
            // because phone number ID is retrived by parsing phone numbers
            // list
            createLandlinePhoneNumber: ['createMobilePhoneNumber', function (cb) {
                createPhoneNumber.call({
                    phoneType: 'landline'
                }, csrfToken, user.id, request, function (err, landlinePhoneNumber) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, landlinePhoneNumber);
                });
            }],

            displayUserFieldUsedBy: ['createMobilePhoneNumber', 'createLandlinePhoneNumber', function (cb, results) {
                var mobilePhoneNumber = results.createMobilePhoneNumber;
                var landlinePhoneNumber = results.createLandlinePhoneNumber;

                displayUserFieldUsedBy.call({
                    entity: 'phone_numbers',
                    formData: {
                        mobile_phone_number: mobilePhoneNumber.id,
                        landline_phone_number: landlinePhoneNumber.id
                    },
                    request: request,
                    csrfToken: csrfToken,
                    user: user
                }, makeARequest)(done);
            }]
        }, function (err, results) {
            if (err) {
                return done(err);
            }

            done();
        });
    });
});