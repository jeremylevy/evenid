var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');
var createNotificationHandler = require('../../../../testUtils/clients/createNotificationHandler');

var isValidNotificationHandlerList = require('../../../../testUtils/validators/isValidNotificationHandlerList');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /clients/:client_id/notification-handlers', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, page, statusCode, request, cb) {
                var URL = '/clients/' 
                            + clientID 
                            + '/notification-handlers';

                if (page) {
                    URL += '/page/' + page;
                }

                request
                    .get(URL)
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

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;
            var page = null;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, page, 302, request, function (err, resp) {
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

    it('displays error when invalid client ID', function (done) {
        var clientID = mongoose.Types.ObjectId().toString();
        var page = null;

        makeARequest(clientID, page, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('redirects to 404 error page when invalid page', function (done) {
        var clientID = mongoose.Types.ObjectId().toString();
        var page = 'bar';

        makeARequest(clientID, page, 404, request, function (err, resp) {
            if (err) {
                return done(err);
            }
            
            done();
        });
    });

    it('displays notification handlers when valid client ID', function (done) {
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

                createNotificationHandler.call({
                    eventType: 'USER_DID_REVOKE_ACCESS'
                }, csrfToken, client.id, request, function (err, notificationHandler) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, notificationHandler);
                });
            }],

            // Make sure it was created after the first
            // given that we want it in page 2
            createNotificationHandler2: ['createNotificationHandler', function (cb, results) {
                var client = results.createClient;

                createNotificationHandler.call({
                    // Make sure event type was different from first
                    // given that client cannot have more than one notification
                    //  handler per event type
                    eventType: 'USER_DID_UPDATE_PERSONAL_INFORMATION'
                }, csrfToken, client.id, request, function (err, notificationHandler) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, notificationHandler);
                });
            }],

            checkNotificationHandlers: ['createNotificationHandler',
                                        'createNotificationHandler2', function (cb, results) {
                
                var client = results.createClient;
                var notificationHandler = results.createNotificationHandler;
                var notificationHandler2 = results.createNotificationHandler2;

                async.auto({
                    whenPageIsNotSet: function (cb) {
                        var page = null;

                        makeARequest(client.id, page, 200, request, function (err, resp) {
                            if (err) {
                                return cb(err);
                            }

                            isValidNotificationHandlerList(notificationHandler, resp.text);

                            cb(null, resp);
                        });
                    },

                    onFirstPage: function (cb) {
                        var page = 1;

                        makeARequest(client.id, page, 200, request, function (err, resp) {
                            if (err) {
                                return cb(err);
                            }

                            isValidNotificationHandlerList(notificationHandler, resp.text);

                            cb(null, resp);
                        });
                    },

                    onSecondPage: function (cb) {
                        var page = 2;

                        makeARequest(client.id, page, 200, request, function (err, resp) {
                            if (err) {
                                return cb(err);
                            }

                            isValidNotificationHandlerList(notificationHandler2, resp.text);

                            cb(null, resp);
                        });
                    },

                    onLastPage: function (cb) {
                        var page = 'last';

                        makeARequest(client.id, page, 302, request, function (err, resp) {
                            if (err) {
                                return cb(err);
                            }

                            request.get(resp.headers.location).end(function (err, resp) {
                                if (err) {
                                    return cb(err);
                                }
                                
                                isValidNotificationHandlerList(notificationHandler2, resp.text);

                                cb(null, resp);
                            });
                        });
                    }
                }, function (err, results) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null);
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