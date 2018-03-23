var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');

var validRedirectionURI = require('../../../../testUtils/data/validRedirectionURI');

var isValidRedirectionURIList = require('../../../../testUtils/validators/isValidRedirectionURIList');
var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('POST /clients/:client_id/redirection-uris', function () {
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
                          + '/redirection-uris')
                    // Body parser middleware need 
                    // it in order to populate req.body
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
        // We don't need to create client 
        // because redirect to login page 
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
                                   + '/redirection-uris');

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);

                    assert.ok(!!resp.text.match(/Uri must be set/));
                    assert.ok(!!resp.text.match(/Scope must be set/));
                    assert.ok(!!resp.text.match(/Response type must be set/));

                    done();
                });
            });
        });
    });

    it('displays errors when invalid uri length', function (done) {
        var redirectionURI = validRedirectionURI(csrfToken);

        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            redirectionURI.redirect_uri = 'http://'
                                        + new Array(config.EVENID_OAUTH_REDIRECTION_URIS
                                                          .MAX_LENGTHS
                                                          .URI + 2).join('a')
                                        + '.com';

            makeARequest(client.id, redirectionURI, 
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/clients/' + client.id + '/redirection-uris');

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);

                    assert.ok(!!resp.text.match(/URI is too long/));

                    done();
                });
            });
        });
    });

    it('displays errors when invalid form data', function (done) {
        var redirectionURI = validRedirectionURI(csrfToken);

        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            redirectionURI.redirect_uri = 'bar';
            redirectionURI.authorizations = ['bar'];
            redirectionURI.response_type = 'bar';

            makeARequest(client.id, redirectionURI, 
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/clients/' + client.id + '/redirection-uris');

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);

                    assert.ok(!!resp.text.match(/URI is invalid\./));
                    assert.ok(!!resp.text.match(/Scope contains invalid values\./));
                    assert.ok(!!resp.text.match(/Response type is not an allowed value\./));

                    done();
                });
            });
        });
    });

    it('redirects to client\'s redirection '
       + 'uris page when valid form data', function (done) {
        
        var redirectionURI = validRedirectionURI(csrfToken);

        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            makeARequest(client.id, redirectionURI, 
                         302, request, function (err, resp) {
                
                var redirectReg = new RegExp('/clients/' + client.id 
                                             + '/redirection-uris');
                
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.headers.location.match(redirectReg));

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isValidRedirectionURIList(redirectionURI, resp.text);

                    done();
                });
            });
        });
    });
});