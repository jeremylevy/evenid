var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var displayUserFieldUsedBy = require('../../../../testUtils/tests/displayUserFieldUsedBy')

var updateUser = require('../../../../testUtils/users/update');

var validClient = require('../../../../testUtils/data/validClient');

var isValidChangePasswordPage = require('../../../../testUtils/validators/isValidChangePasswordPage');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /users/:user_id/change-password', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, statusCode, request, cb) {
                request
                    .get('/users/' + userID 
                         + '/change-password')
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

            if (err) {
                return done(err);
            }

            makeARequest(userID, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual('/login', resp.headers.location);

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

    it('redirects to valid recover '
       + 'password page when invalid user ID', function (done) {
        
        var userID = mongoose.Types.ObjectId().toString();

        makeARequest(userID, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays recover password '
       + 'form when valid user ID', function (done) {
        
        // Fill user fields
        updateUser(csrfToken, user.id, 
                   request, function (err, user) {
            
            if (err) {
                return done(err);
            }

            makeARequest(user.id, 200,
                         request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }
                
                isValidChangePasswordPage(resp.text);

                done();
            });
        });
    });
});