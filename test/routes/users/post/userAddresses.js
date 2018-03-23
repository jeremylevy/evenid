var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var validAddress = require('../../../../testUtils/data/validAddress');

var isValidUserAddressList = require('../../../../testUtils/validators/isValidUserAddressList');
var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('POST /users/:user_id/addresses', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, data, statusCode, request, cb) {
                request
                    .post('/users/' + userID + '/addresses')
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

            makeARequest(userID, {_csrf: csrfToken}, 302, request, function (err, resp) {
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

    it('displays errors when empty form data', function (done) {
        makeARequest(user.id, {_csrf: csrfToken}, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/users/' + user.id + '/addresses');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);

                assert.ok(!!resp.text.match(/Address type must be set/));
                assert.ok(!!resp.text.match(/Full name must be set/));
                assert.ok(!!resp.text.match(/Address line 1 must be set/));
                assert.ok(!!resp.text.match(/City must be set/));
                assert.ok(!!resp.text.match(/Postal code must be set/));
                assert.ok(!!resp.text.match(/Country must be set/));

                done();
            });
        });
    });

    it('displays errors when invalid form data', function (done) {
        var address = validAddress(csrfToken);

        address.address_type = 'bar';
        address.full_name = new Array(config.EVENID_ADDRESSES.MAX_LENGTHS.FULL_NAME + 2).join('a');
        address.address_line_1 = new Array(config.EVENID_ADDRESSES.MAX_LENGTHS.ADDRESS_LINE_1 + 2).join('a');
        address.address_line_2 = new Array(config.EVENID_ADDRESSES.MAX_LENGTHS.ADDRESS_LINE_2 + 2).join('a');
        address.access_code = new Array(config.EVENID_ADDRESSES.MAX_LENGTHS.ACCESS_CODE + 2).join('a');
        address.city = new Array(config.EVENID_ADDRESSES.MAX_LENGTHS.CITY + 2).join('a');
        address.state = new Array(config.EVENID_ADDRESSES.MAX_LENGTHS.STATE + 2).join('a');
        address.postal_code = new Array(config.EVENID_ADDRESSES.MAX_LENGTHS.POSTAL_CODE + 2).join('a');
        address.country = 'bar';

        makeARequest(user.id, address, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/users/' + user.id + '/addresses');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);

                assert.ok(!!resp.text.match(/Address type is not an allowed value/));
                assert.ok(!!resp.text.match(/Full name is too long/));
                assert.ok(!!resp.text.match(/Address line 1 is too long/));
                assert.ok(!!resp.text.match(/Address line 2 is too long/));
                assert.ok(!!resp.text.match(/Access code is too long/));
                assert.ok(!!resp.text.match(/City is too long/));
                assert.ok(!!resp.text.match(/State is too long/));
                assert.ok(!!resp.text.match(/Postal code is too long/));
                assert.ok(!!resp.text.match(/Country is invalid/));

                done();
            });
        });
    });

    it('redirects to user\'s addresses page when valid form data', function (done) {
        var address = validAddress(csrfToken);

        makeARequest(user.id, address, 302, request, function (err, resp) {
            var redirectReg = new RegExp('/users/' + user.id + '/addresses');
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(redirectReg));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/The address has been successfully created\./));

                isValidUserAddressList(address, resp.text);

                done();
            });
        });
    });
});