var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');
var createNotificationHandler = require('../../../../testUtils/clients/createNotificationHandler');

var isValidNotificationHandlerPage = require('../../../../testUtils/validators/isValidNotificationHandlerPage');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /clients/:client_id/notification-handlers/:notification_handler_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, notificationHandlerID, 
                                     statusCode, request, cb) {
                
                request
                    .get('/clients/' 
                         + clientID 
                         + '/notification-handlers/' 
                         + notificationHandlerID)
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

    it('displays error when invalid client '
       + 'ID and notification handler ID', function (done) {
        
        var clientID = mongoose.Types.ObjectId().toString();
        var notificationHandlerID = mongoose.Types.ObjectId().toString();

        makeARequest(clientID, notificationHandlerID, 
                     403, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays notification handler when valid '
       + 'client ID and notification handler ID', function (done) {
        
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

            checkNotificationHandler: ['createNotificationHandler', function (cb, results) {
                var client = results.createClient;
                var notificationHandler = results.createNotificationHandler;

                makeARequest(client.id, notificationHandler.id, 
                             200, request, function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    // Make sure client's notification handler form is filled
                    isValidNotificationHandlerPage(notificationHandler, resp.text);

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