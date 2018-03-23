var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;

var makeARequest = null;

var validEmail = function () {
    return mongoose.Types.ObjectId().toString() + '@evenid.com';
};

describe('POST /users/is-registered', function () {
    before(function (done) {
        getUnloggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;

            makeARequest = function (data, statusCode, request, cb) {
                var req = request
                            .post('/users/is-registered')
                            // Used through Ajax
                            .set('X-Requested-With', 'XMLHttpRequest')
                            // Body parser middleware need it 
                            // in order to populate req.body
                            .set('Content-Type', 'application/x-www-form-urlencoded')
                            .send(data)
                            .expect(statusCode)
                            .expect('Content-Type', 'application/json; charset=utf-8');

                req.end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            };

            done();
        });
    });

    it('returns JSON object with errors '
       + 'when user is logged', function (done) {

        getLoggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest({
                email: mongoose.Types.ObjectId().toString() + '@evenid.com',
                _csrf: csrfToken
            }, 403, request, function (err, resp) {
                var error = resp && resp.body;

                if (err) {
                    return done(err);
                }

                assert.doesNotThrow(function () {
                    JSON.parse(resp.text);
                });

                assert.strictEqual(error.type, 'access_denied');
                assert.strictEqual(error.messages.main, 'You are not authorized to access this resource.');

                done();
            });
        });
    });

    it('returns JSON object with errors '
       + 'when empty user email', function (done) {
        
        makeARequest({
            _csrf: csrfToken
        }, 400, request, function (err, resp) {
            var error = resp && resp.body;
            
            if (err) {
                return done(err);
            }

            assert.doesNotThrow(function () {
                JSON.parse(resp.text);
            });

            assert.strictEqual(error.type, 'invalid_request');
            assert.strictEqual(error.messages.email, 'Email must be set.');

            done();
        });
    });

    it('returns JSON object with errors when '
       + 'invalid user email', function (done) {

        makeARequest({
            email: 'bar',
            _csrf: csrfToken
        }, 400, request, function (err, resp) {
            var error = resp && resp.body;

            if (err) {
                return done(err);
            }

            assert.doesNotThrow(function () {
                JSON.parse(resp.text);
            });

            assert.strictEqual(error.type, 'invalid_request');
            assert.strictEqual(error.messages.email, 'Email is invalid.');

            done();
        });
    });

    it('returns JSON object with `is_registered` set to `false` '
       + 'when user is not registered', function (done) {

        makeARequest({
            email: validEmail(),
            _csrf: csrfToken
        }, 200, request, function (err, resp) {
            var obj = resp && resp.body;

            if (err) {
                return done(err);
            }

            assert.doesNotThrow(function () {
                JSON.parse(resp.text);
            });

            assert.deepEqual(obj, {is_registered: false});

            done();
        });
    });

    it('returns JSON object with `is_registered` set to '
       + '`true` when user is registered', function (done) {

        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            makeARequest({
                email: resp.user.email,
                _csrf: csrfToken
            }, 200, request, function (err, resp) {
                var obj = resp && resp.body;

                if (err) {
                    return done(err);
                }

                assert.doesNotThrow(function () {
                    JSON.parse(resp.text);
                });

                assert.deepEqual(obj, {is_registered: true});

                done();
            });
        });
    });
});