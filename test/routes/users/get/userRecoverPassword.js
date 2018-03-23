var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var isValidRecoverPasswordPage = require('../../../../testUtils/validators/isValidRecoverPasswordPage');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /recover-password', function () {
    before(function (done) {
        getUnloggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;

            makeARequest = function (statusCode, request, cb) {
                request
                    .get('/recover-password')
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

            makeARequest(302, request, function (err, resp) {
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

    it('displays recover password form when user is unlogged', function (done) {
        makeARequest(200, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            // '': email field value
            isValidRecoverPasswordPage('', resp.text);

            done();
        });
    });

    it('prefills email field after failed login requests', function (done) {
        var usedEmail = mongoose.Types.ObjectId().toString() + '@evenid.com';
        
        async.auto({
            makeLoginReq: function (cb) {
                request
                    .post('/login')
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .send({
                        email: usedEmail,
                        password: 'bar',
                        _csrf: csrfToken
                    })
                    .end(cb);
            } 
        }, function (err, results) {
            if (err) {
                return done(err);
            }

            makeARequest(200, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                isValidRecoverPasswordPage(usedEmail, resp.text);

                done();
            });
        }); 
    });
});