var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');
var createRedirectionURI = require('../../../../testUtils/clients/createRedirectionURI');

var IsInput = require('../../../../testUtils/validators/isInput');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /clients/:client_id/redirection-uris/:redirection_uri_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, redirectionURIID, 
                                     statusCode, request, cb) {
                
                request
                    .get('/clients/' + clientID 
                         + '/redirection-uris/' + redirectionURIID)
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
        var redirectionURIID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, redirectionURIID, 
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

    it('displays error when invalid client ID and redirection uri ID', function (done) {
        var clientID = mongoose.Types.ObjectId().toString();
        var redirectionURIID = mongoose.Types.ObjectId().toString();

        makeARequest(clientID, redirectionURIID, 
                     403, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays redirection uri when valid '
       + 'client ID and redirection uri ID', function (done) {
        
        async.auto({
            createClient: function (cb) {
                createClient(csrfToken, request, function (err, client) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, client);
                });
            },

            createRedirectionURI: ['createClient', function (cb, results) {
                var client = results['createClient'];

                createRedirectionURI(csrfToken, client.id, 
                                     request, function (err, redirectionURI) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, redirectionURI);
                });
            }],

            checkRedirectionURI: ['createRedirectionURI', function (cb, results) {
                var client = results['createClient'];
                var redirectionURI = results['createRedirectionURI'];

                makeARequest(client.id, redirectionURI.id, 200, request, function (err, resp) {
                    var isInput = IsInput(resp.text);
                    var scopeFlags = null;

                    if (err) {
                        return cb(err);
                    }

                    /* Make sure client's redirection URI form is filled */

                    isInput('url', 'redirect_uri', redirectionURI.redirect_uri);

                    redirectionURI.authorizations.forEach(function (scope) {
                        isInput('checkbox', 'authorizations[]', scope, 'checked');
                    });

                    for (var scopeFlag in redirectionURI.authorization_flags) {
                        scopeFlags = redirectionURI.authorization_flags[scopeFlag];

                        if (!Array.isArray(scopeFlags)) {
                            scopeFlags = [scopeFlags];
                        }

                        scopeFlags.forEach(function (scopeFlagValue) {
                            isInput('checkbox', 
                                    'authorization_flags[' + scopeFlag + ']', 
                                    scopeFlagValue, 
                                    'checked');
                        });
                    }

                    isInput('radio', 'response_type', 
                            redirectionURI.response_type, 'checked');

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