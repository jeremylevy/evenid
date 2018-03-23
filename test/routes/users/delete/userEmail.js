var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createEmail = require('../../../../testUtils/users/createEmail');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('DELETE /users/:user_id/emails/:email_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, emailID, csrfToken, 
                                     statusCode, request, cb) {
                
                request
                    .delete('/users/' + userID 
                            + '/emails/' + emailID)
                    // Body parser middleware need 
                    // it in order to populate req.body
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
        var emailID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, emailID, csrfToken,
                         302, request, function (err, resp) {
                
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

    it('redirects to user emails page if error', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var emailID = mongoose.Types.ObjectId().toString();
        var redirectURI = '/users/' + userID 
                        + '/emails/' + emailID;

        makeARequest(userID, emailID, csrfToken, 
                     302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, redirectURI);

            request.get(resp.headers.location)
                   .expect(403, function (err, resp) {
                
                assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

                done();
            });
        });
    });

    it('redirects to user emails page and display '
       + 'success notification when successful user '
       + 'email deletion', function (done) {

        async.auto({
            createEmail: function (cb) {
                createEmail(csrfToken, user.id, user.password, 
                            request, function (err, email) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, email);
                });
            },

            deleteEmail: ['createEmail', function (cb, results) {
                var email = results.createEmail;

                makeARequest(user.id, email.id, csrfToken, 
                             302, request, function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    assert.strictEqual(resp.headers.location,
                                       '/users/' + user.id + '/emails');

                    cb(null, resp);
                });
            }],

            checkRedirect: ['deleteEmail', function (cb, results) {
                var resp = results.deleteEmail;
                var email = results.createEmail;

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(!!resp.text.match(/The email has been successfully deleted/));

                    // Make sure email is not displayed anymore on page
                    assert.ok(!resp.text.match(new RegExp(email.id)));

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