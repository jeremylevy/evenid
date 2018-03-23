var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var displayUserFieldUsedBy = require('../../../../testUtils/tests/displayUserFieldUsedBy');

var createAddress = require('../../../../testUtils/users/createAddress');

var isValidUserAddressPage = require('../../../../testUtils/validators/isValidUserAddressPage');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /users/:user_id/addresses/:address_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, addressID, statusCode, request, cb) {
                request
                    .get('/users/' + userID + '/addresses/' + addressID)
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
        var addressID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, addressID, 302, request, function (err, resp) {
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

    it('displays error when invalid user ID and address ID', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var addressID = mongoose.Types.ObjectId().toString();

        makeARequest(userID, addressID, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays address when valid user ID and address ID', function (done) {
        async.auto({
            createAddress: function (cb) {
                createAddress(csrfToken, user.id, request, function (err, address) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, address);
                });
            },

            checkAddress: ['createAddress', function (cb, results) {
                var address = results.createAddress;

                makeARequest(user.id, address.id, 200, request, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    isValidUserAddressPage(address, resp.text);

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
        createAddress(csrfToken, user.id, request, function (err, address) {
            if (err) {
                return done(err);
            }

            displayUserFieldUsedBy.call({
                entity: 'address',
                formData: {
                    shipping_address: address.id,
                    billing_address: address.id
                },
                request: request,
                csrfToken: csrfToken,
                user: user
            }, makeARequest)(done);
        });
    });
});