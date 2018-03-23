var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createPhoneNumber = require('../../../../testUtils/users/createPhoneNumber');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('DELETE /users/:user_id/phone-numbers/:phone_number_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, phoneNumberID, csrfToken, statusCode, request, cb) {
                request
                    .delete('/users/' + userID + '/phone-numbers/' + phoneNumberID)
                    // Body parser middleware need it in order to populate req.body
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .send({
                        _csrf: csrfToken
                    })
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
        // We don't need to create client because redirect to login page
        // occurs before the deletion
        var userID = mongoose.Types.ObjectId().toString();
        var phoneNumberID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, phoneNumberID, csrfToken, 302, request, function (err, resp) {
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

    it('redirects to user phone numbers page if error', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var phoneNumberID = mongoose.Types.ObjectId().toString();
        var redirectURI = '/users/' + userID 
                        + '/phone-numbers/' + phoneNumberID;

        makeARequest(userID, phoneNumberID, csrfToken, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, redirectURI);

            request.get(resp.headers.location).expect(403, function (err, resp) {
                assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

                done();
            });
        });
    });

    it('redirects to user phone numbers page and display success notification when '
       + 'successful user phone number deletion', function (done) {

        async.auto({
            createPhoneNumber: function (cb) {
                createPhoneNumber(csrfToken, user.id, request, function (err, phoneNumber) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, phoneNumber);
                });
            },

            deletePhoneNumber: ['createPhoneNumber', function (cb, results) {
                var phoneNumber = results.createPhoneNumber;

                makeARequest(user.id, phoneNumber.id, csrfToken, 302, request, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    assert.strictEqual(resp.headers.location, '/users/' + user.id + '/phone-numbers');

                    cb(null, resp);
                });
            }],

            checkRedirect: ['deletePhoneNumber', function (cb, results) {
                var resp = results.deletePhoneNumber;
                var phoneNumber = results.createPhoneNumber;

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(!!resp.text.match(/The phone number has been successfully deleted/));

                    // Make sure email is not displayed anymore on page
                    assert.ok(!resp.text.match(new RegExp(phoneNumber.id)));

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
});