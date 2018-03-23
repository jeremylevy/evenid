var assert = require('assert');

var mongoose = require('mongoose');

var getLoggedRequest = require('../getLoggedRequest');
var getUnloggedRequest = require('../getUnloggedRequest');

var IsInput = require('../validators/isInput');

module.exports = function (form) {
    var request = null;
    var csrfToken = null;
    var user = null;

    var makeARequest = null;

    describe('GET /' + form, function () {
        before(function (done) {
            getLoggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;
                csrfToken = resp.csrfToken;
                user = resp.user;

                makeARequest = function (statusCode, request, cb) {
                    request
                        .get('/' + form)
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
            makeARequest(302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/users/' + user.id);

                done();
            });
        });

        it('displays registration form when user is unlogged', function (done) {
            getUnloggedRequest(function (err, resp) {
                var request = resp.request;

                if (err) {
                    return done(err);
                }

                makeARequest(200, request, function (err, resp) {
                    var isInput = IsInput(resp.text);

                    if (err) {
                        return done(err);
                    }

                    isInput('email', 'email', '');
                    isInput('password', 'password', '');
                    isInput('checkbox', 'persistent_login', '');

                    if (form === 'registration') {
                        isInput('hidden', 'timezone', '');
                        assert.ok(!!resp.text.match(/Intl\.DateTimeFormat\(\)\.resolved\.timeZone/));
                    }

                    done();
                });
            });
        });
    });
};