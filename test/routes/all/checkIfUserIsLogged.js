var assert = require('assert');
var querystring = require('querystring');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../config');

var getUnloggedRequest = require('../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../testUtils/tests/authorizeOauthClientForUser');

var makeARequest = null;

describe('ALL / Check if user is logged', function () {
    before(function () {
        makeARequest = function (URI, request, statusCode, cb) {
            request
                .get(URI)
                .expect(statusCode, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
        };
    });

    it('redirects to login page when trying '
       + 'to access logged-restricted page', function (done) {

        // Make sure query string
        // was preserved during login
        // redirect
        var loggedPage = '/clients?foo=bar';

        async.auto({
            getUnloggedRequest: function (cb) {
                getUnloggedRequest(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            // We access the clients
            // page while unlogged
            getLoggedPage: ['getUnloggedRequest', function (cb, results) {
                var resp = results.getUnloggedRequest;

                var request = resp.request;

                // Make sure we are redirected
                // to login page
                makeARequest(loggedPage, request, 302, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    assert.strictEqual(resp.headers.location, '/login');

                    cb(null, resp);
                });
            }],

            // Make sure notification was displayed
            getLoginPage: ['getLoggedPage', function (cb, results) {
                var resp = results.getUnloggedRequest;
                
                var request = resp.request;

                request.get('/login')
                       .end(function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(!!resp.text.match(/You must log in to see this page\./));

                    cb();
                });
            }],

            // Make sure we are 
            // redirected to wanted page
            login: ['getLoginPage', function (cb, results) {
                var resp = results.getUnloggedRequest;
                
                var request = resp.request;

                var ID = mongoose.Types.ObjectId().toString();
                var data = {
                    email: ID + '@evenid.com',
                    password: ID,
                    _csrf: resp.csrfToken
                };

                request.post('/register')
                       .set('Content-Type', 'application/x-www-form-urlencoded')
                       .send(data)
                       .end(function (err, resp) {

                    if (err) {
                        return cb(err);
                    }

                    assert.strictEqual(resp.headers.location, loggedPage);

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
    
    it('prevents redirecting user to wanted '
       + 'page if it was not logged immediately', function (done) {

        var loggedPage = '/clients';

        async.auto({
            getUnloggedRequest: function (cb) {
                getUnloggedRequest(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            // We access the clients
            // page while unlogged
            getLoggedPage: ['getUnloggedRequest', function (cb, results) {
                var resp = results.getUnloggedRequest;

                var request = resp.request;

                makeARequest(loggedPage, request, 302, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            // Make sure redirected will not happen
            // if user don't log in immediately
            getIndexPage: ['getLoggedPage', function (cb, results) {
                var resp = results.getUnloggedRequest;
                
                var request = resp.request;

                request.get('/')
                       .end(function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb();
                });
            }],

            // Make sure we are not
            // redirected to wanted page
            login: ['getIndexPage', function (cb, results) {
                var resp = results.getUnloggedRequest;
                
                var request = resp.request;

                var ID = mongoose.Types.ObjectId().toString();
                var data = {
                    email: ID + '@evenid.com',
                    password: ID,
                    _csrf: resp.csrfToken
                };

                var userPageReg = new RegExp('^/users/' 
                                             + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                                             + '$');

                request.post('/register')
                       .set('Content-Type', 'application/x-www-form-urlencoded')
                       .send(data)
                       .end(function (err, resp) {

                    if (err) {
                        return cb(err);
                    }
                    
                    assert.ok(!!resp.headers.location.match(userPageReg));

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