var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createRecoverPasswordRequest = require('../../../../testUtils/users/createRecoverPasswordRequest');

var isValidRecoverPasswordCodePage = require('../../../../testUtils/validators/isValidRecoverPasswordCodePage');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

var invalidCode = '9bef2485410e9378bc9adfb3e32236af4f683fa2';

describe('GET /recover-password/:code', function () {
    before(function (done) {
        getUnloggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;

            makeARequest = function (code, statusCode, request, cb) {
                request
                    .get('/recover-password/' + code)
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

    it('redirects to user page when user is logged', function (done) {
        getLoggedRequest(function (err, resp) {
            var request = resp && resp.request;
            var user = resp && resp.user;

            if (err) {
                return done(err);
            }

            makeARequest(invalidCode, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/users/' + user.id);

                request.get('/users/' + user.id).end(function (err, resp) {
                    assert.ok(!!resp.text.match(/You must log out to see this page/));

                    done();
                });
            });
        });
    });

    it('displays error when invalid code', function (done) {
        makeARequest(invalidCode, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/recover-password');

            request.get('/recover-password').end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(new RegExp('The link you have followed is '
                                                     + 'invalid or expired. Please retry.')));

                done();
            });
        });
    });

    it('displays recover password form with prefilled email when valid code', function (done) {
        async.auto({
            getLoggedRequest: function (cb) {
                getLoggedRequest(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            createRecoverPasswordReq: ['getLoggedRequest', function (cb, results) {
                var email = results.getLoggedRequest.user.email;

                createRecoverPasswordRequest(csrfToken, email, request, function (err, code) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, code);
                });
            }]
        }, function (err, results) {
            var email = results && results.getLoggedRequest.user.email;
            var code = results && results.createRecoverPasswordReq;

            if (err) {
                return done(err);
            }

            makeARequest(code, 200, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                isValidRecoverPasswordCodePage(email, resp.text);

                done();
            });
        });
    });
});