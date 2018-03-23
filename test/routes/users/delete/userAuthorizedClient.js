var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('DELETE /users/:user_id/authorized-clients/:authorized_client_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, authorizedOauthClientID,
                                     csrfToken, statusCode, request, cb) {
                
                request
                    .delete('/users/' + userID 
                            + '/authorized-clients/' 
                            + authorizedOauthClientID)
                    // Body parser middleware need it 
                    // in order to populate req.body
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
        var authorizedOauthClientID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, authorizedOauthClientID,
                         csrfToken, 302, request, function (err, resp) {
                
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

    it('redirects to user authorized client page if error', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var authorizedOauthClientID = mongoose.Types.ObjectId().toString();
        var redirectURI = '/users/' + userID 
                        + '/authorized-clients/' + authorizedOauthClientID;

        makeARequest(userID, authorizedOauthClientID,
                     csrfToken, 302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, redirectURI);

            request.get(resp.headers.location).expect(403, function (err, resp) {
                assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

                done();
            });
        });
    });

    it('redirects to user page and display success notification when '
       + 'successful authorized oauth client deletion', function (done) {

        async.auto({
            createOauthClient: function (cb) {
                oauthAuthorizeBeforeHook(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            authorizeOauthClientForUser: ['createOauthClient', function (cb, results) {
                var resp = results.createOauthClient;

                authorizeOauthClientForUser(resp, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            deleteAuthorizedOauthClient : ['authorizeOauthClientForUser', function (cb, results) {
                var resp = results.createOauthClient;
                var user = results.authorizeOauthClientForUser.formData;

                makeARequest(resp.user.id, resp.client.id, resp.csrfToken,
                             302, resp.request, function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            assertOauthClientAuthDeletion: ['deleteAuthorizedOauthClient', function (cb, results) {
                var createOauthClientResp = results.createOauthClient;
                var deleteAuthorizedOauthClientResp = results.deleteAuthorizedOauthClient;

                createOauthClientResp.request
                                     .get(deleteAuthorizedOauthClientResp.headers.location)
                                     .end(function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(!!resp.text.match(/You are now unsubscribed from this app\./));

                    // Make sure oauth client authorization 
                    // is not displayed anymore on page
                    assert.ok(!resp.text.match(
                        new RegExp('authorized-clients/' 
                                   + createOauthClientResp.client.id)
                    ));

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