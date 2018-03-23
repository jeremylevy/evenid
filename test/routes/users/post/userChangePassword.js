var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var isValidChangePasswordPage = require('../../../../testUtils/validators/isValidChangePasswordPage');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('POST /users/:user_id/change-password', function () {
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
                    .post('/users/' + userID + '/change-password')
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
        makeARequest(user.id, {
            _csrf: csrfToken
        }, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location,
                               '/users/' + user.id + '/change-password');

            request.get(resp.headers.location)
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);

                assert.ok(!!resp.text.match(/Your current password is invalid/));

                done();
            });
        });
    });

    it('displays errors when invalid current password', function (done) {
        var data = {
            current_password: 'bar',
            new_password: user.password,
            _csrf: csrfToken
        };

        makeARequest(user.id, data, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location,
                               '/users/' + user.id + '/change-password');

            request.get(resp.headers.location)
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);

                assert.ok(!!resp.text.match(/Your current password is invalid/));

                done();
            });
        });
    });

    it('displays errors when invalid new password', function (done) {
        var data = {
            current_password: user.password,
            new_password: 'bar',
            _csrf: csrfToken
        };

        makeARequest(user.id, data, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location,
                               '/users/' + user.id + '/change-password');

            request.get(resp.headers.location)
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);

                assert.ok(!!resp.text.match(/Your password must be at least [0-9]+ characters/));

                done();
            });
        });
    });

    it('redirects to change password '
       + 'page when valid form data', function (done) {
        
        var data = {
            current_password: user.password,
            new_password: 'barbar',
            _csrf: csrfToken
        };

        makeARequest(user.id, data, 302, request, function (err, resp) {
            var redirectReg = new RegExp('/users/' 
                                         + user.id 
                                         + '/change-password');
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(redirectReg));

            request.get(resp.headers.location)
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/Your password has been successfully updated/));

                isValidChangePasswordPage(resp.text);

                done();
            });
        });
    });
});