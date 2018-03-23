var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var displayUserFieldUsedBy = require('../../../../testUtils/tests/displayUserFieldUsedBy');

var createAddress = require('../../../../testUtils/users/createAddress');

var isValidUserAddressList = require('../../../../testUtils/validators/isValidUserAddressList');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /users/:user_id/addresses', function () {
    before(function () {
        makeARequest = function (userID, page, statusCode, request, cb) {
            var URI = '/users/' + userID + '/addresses';

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

    // Given that adresses are paginated
    // we not want addresses to be added
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
        var page = null;

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

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

    it('displays addresses when valid user ID', function (done) {
        async.auto({
            createAddress: function (cb) {
                createAddress(csrfToken, user.id, request, function (err, address) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, address);
                });
            },

            createAddress2: ['createAddress', function (cb) {
                createAddress(csrfToken, user.id, request, function (err, address) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, address);
                });
            }],

            checkAddresses: ['createAddress', 'createAddress2', function (cb, results) {
                var address = results.createAddress;
                var address2 = results.createAddress2;

                var page = 1;

                makeARequest(user.id, page, 200, request, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    isValidUserAddressList(address, resp.text);

                    page = 2;

                    makeARequest(user.id, page, 200, request, function (err, resp) {
                        if (err) {
                            return cb(err);
                        }

                        isValidUserAddressList(address2, resp.text);

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
        createAddress(csrfToken, user.id, request, function (err, address) {
            if (err) {
                return done(err);
            }

            displayUserFieldUsedBy.call({
                entity: 'addresses',
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