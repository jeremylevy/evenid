var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');
var createNotificationHandler = require('../../../../testUtils/clients/createNotificationHandler');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('DELETE /clients/:client_id/notification-handlers/:notification_handler_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, notificationHandlerID, 
                                     csrfToken, statusCode, request, cb) {
                
                request
                    .delete('/clients/' 
                            + clientID 
                            + '/notification-handlers/' 
                            + notificationHandlerID)
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
        var clientID = mongoose.Types.ObjectId().toString();
        var notificationHandlerID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, notificationHandlerID, 
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

    it('redirects to client notification handlers page if error', function (done) {
        var clientID = mongoose.Types.ObjectId().toString();
        var notificationHandlerID = mongoose.Types.ObjectId().toString();
        var redirectURI = '/clients/' + clientID 
                        + '/notification-handlers/' + notificationHandlerID;

        makeARequest(clientID, notificationHandlerID, 
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

    it('redirects to client notification handlers page and '
       + 'display success notification when successful client '
       + 'notification handler deletion', function (done) {

        async.auto({
            createClient: function (cb) {
                createClient(csrfToken, request, function (err, client) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, client);
                });
            },

            createNotificationHandler: ['createClient', function (cb, results) {
                var client = results.createClient;

                createNotificationHandler(csrfToken, client.id, 
                                          request, function (err, notificationHandler) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, notificationHandler);
                });
            }],

            deleteNotificationHandler: ['createNotificationHandler', function (cb, results) {
                var client = results.createClient;
                var notificationHandler = results.createNotificationHandler;

                makeARequest(client.id, notificationHandler.id, 
                             csrfToken, 302, request, function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    assert.strictEqual(resp.headers.location,
                                       '/clients/' + client.id 
                                       + '/notification-handlers');

                    cb(null, resp);
                });
            }],

            checkRedirect: ['deleteNotificationHandler', function (cb, results) {
                var resp = results.deleteNotificationHandler;
                var notificationHandler = results.createNotificationHandler;

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(
                        !!resp.text.match(/The notification handler has been successfully deleted/)
                    );

                    // Make sure notification handler is not displayed anymore on page
                    assert.ok(!resp.text.match(new RegExp(notificationHandler.id)));

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