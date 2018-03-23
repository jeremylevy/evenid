var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var displayUserFieldUsedBy = require('../../../../testUtils/tests/displayUserFieldUsedBy');

var createPhoneNumber = require('../../../../testUtils/users/createPhoneNumber');

var isValidUserPhoneNumberPage = require('../../../../testUtils/validators/isValidUserPhoneNumberPage');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /users/:user_id/phone-numbers/:phone_number_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, phoneNumberID, statusCode, request, cb) {
                request
                    .get('/users/' + userID + '/phone-numbers/' + phoneNumberID)
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
        var phoneNumberID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, phoneNumberID, 302, request, function (err, resp) {
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

    it('displays error when invalid user ID and phone number ID', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var phoneNumberID = mongoose.Types.ObjectId().toString();

        makeARequest(userID, phoneNumberID, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays phone number when valid user ID and phone number ID', function (done) {
        async.auto({
            createPhoneNumber: function (cb) {
                createPhoneNumber(csrfToken, user.id, request, function (err, phoneNumber) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, phoneNumber);
                });
            },

            checkPhoneNumber: ['createPhoneNumber', function (cb, results) {
                var phoneNumber = results.createPhoneNumber;

                makeARequest(user.id, phoneNumber.id, 200, request, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    isValidUserPhoneNumberPage(phoneNumber, resp.text);

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
                    entity: 'phone_number',
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