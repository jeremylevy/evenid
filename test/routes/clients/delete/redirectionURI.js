var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');
var createRedirectionURI = require('../../../../testUtils/clients/createRedirectionURI');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('DELETE /clients/:client_id/redirection-uris/:redirection_uri_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, redirectionURIID, 
                                     csrfToken, statusCode, request, cb) {
                
                request
                    .delete('/clients/' 
                            + clientID 
                            + '/redirection-uris/' 
                            + redirectionURIID)
                    // Body parser middleware need it in order to populate req.body
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
        var redirectionURIID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, redirectionURIID, 
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
        var redirectionURIID = mongoose.Types.ObjectId().toString();
        var redirectURI = '/clients/' + clientID 
                        + '/redirection-uris/' + redirectionURIID;

        makeARequest(clientID, redirectionURIID, 
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
       + 'redirection URI deletion', function (done) {

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
                var client = results.createClient;

                createRedirectionURI(csrfToken, client.id, 
                                     request, function (err, redirectionURI) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, redirectionURI);
                });
            }],

            deleteRedirectionURI: ['createRedirectionURI', function (cb, results) {
                var client = results.createClient;
                var redirectionURI = results.createRedirectionURI;

                makeARequest(client.id, redirectionURI.id, 
                             csrfToken, 302, request, function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    assert.strictEqual(resp.headers.location,
                                       '/clients/'
                                        + client.id 
                                        + '/redirection-uris');

                    cb(null, resp);
                });
            }],

            checkRedirect: ['deleteRedirectionURI', function (cb, results) {
                var resp = results.deleteRedirectionURI;
                var redirectionURI = results.createRedirectionURI;

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(
                        !!resp.text.match(/The redirection URI has been successfully deleted/)
                    );

                    // Make sure notification handler is not displayed anymore on page
                    assert.ok(!resp.text.match(new RegExp(redirectionURI.id)));

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