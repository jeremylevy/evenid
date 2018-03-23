var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');

var validNotificationHandler = require('../../../../testUtils/data/validNotificationHandler');

var isValidNotificationHandlerList = require('../../../../testUtils/validators/isValidNotificationHandlerList');
var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('POST /clients/:client_id/notification-handlers', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, data, 
                                     statusCode, request, cb) {
                
                request
                    .post('/clients/' + clientID 
                          + '/notification-handlers')
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
        // We don't need to create client because redirect to login page
        // occurs before the deletion
        var clientID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, {
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                
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
        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            makeARequest(client.id, {
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/clients/' + client.id 
                                   + '/notification-handlers');

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);

                    assert.ok(!!resp.text.match(/Url must be set/));
                    assert.ok(!!resp.text.match(/Event type must be set/));

                    done();
                });
            });
        });
    });
    
    it('displays errors when invalid uri length', function (done) {
        var notificationHandler = validNotificationHandler(csrfToken);

        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            notificationHandler.url = 'http://'
                                    + new Array(config.EVENID_OAUTH_HOOKS
                                                      .MAX_LENGTHS
                                                      .URL + 2).join('a')
                                    + '.com';

            makeARequest(client.id, notificationHandler, 
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/clients/' + client.id 
                                   + '/notification-handlers');

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);

                    assert.ok(!!resp.text.match(/This URL is too long/));

                    done();
                });
            });
        });
    });

    it('displays errors when invalid form data', function (done) {
        var notificationHandler = validNotificationHandler(csrfToken);

        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            notificationHandler.url = 'bar';
            notificationHandler.event_type = 'bar';

            makeARequest(client.id, notificationHandler, 
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/clients/' 
                                   + client.id 
                                   + '/notification-handlers');

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);

                    assert.ok(!!resp.text.match(/This URL is not valid/));
                    assert.ok(!!resp.text.match(/Event type is not an allowed value/));

                    done();
                });
            });
        });
    });

    it('redirects to client\'s notification '
       + 'handler page when valid form data', function (done) {
        
        var notificationHandler = validNotificationHandler(csrfToken);

        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            makeARequest(client.id, notificationHandler, 
                         302, request, function (err, resp) {
                
                var redirectReg = new RegExp('/clients/' 
                                             + client.id 
                                             + '/notification-handlers');
                
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.headers.location.match(redirectReg));

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isValidNotificationHandlerList(notificationHandler, 
                                                   resp.text);

                    done();
                });
            });
        });
    });
});