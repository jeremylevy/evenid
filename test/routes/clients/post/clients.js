var assert = require('assert');

var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var validClient = require('../../../../testUtils/data/validClient');

var isValidClientPage = require('../../../../testUtils/validators/isValidClientPage');
var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('POST /clients', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (data, statusCode, request, cb) {
                request
                    .post('/clients')
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
        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(validClient(csrfToken), 302, request, function (err, resp) {
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
        makeARequest({
            _csrf: csrfToken
        }, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/clients');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);

                assert.ok(!!resp.text.match(/Name must be set/));
                assert.ok(!!resp.text.match(/Description must be set/));
                assert.ok(!!resp.text.match(/Website must be set/));
                assert.ok(!!resp.text.match(/Logo must be set/));

                done();
            });
        });
    });

    it('displays errors when invalid fields length', function (done) {
        var client = validClient(csrfToken);

        // `+2` for first and last element
        client.client_name = new Array(config.EVENID_OAUTH_CLIENTS
                                             .MAX_LENGTHS
                                             .NAME + 2).join('a');

        client.client_description = new Array(config.EVENID_OAUTH_CLIENTS
                                                    .MAX_LENGTHS
                                                    .DESCRIPTION + 2).join('a');

        client.client_website = 'http://' 
                              + new Array(config.EVENID_OAUTH_CLIENTS
                                                .MAX_LENGTHS
                                                .WEBSITE + 2).join('a') 
                              + '.com';

        client.client_facebook_username = new Array(config.EVENID_OAUTH_CLIENTS
                                                          .MAX_LENGTHS
                                                          .FACEBOOK_USERNAME + 2).join('a');

        client.client_twitter_username = new Array(config.EVENID_OAUTH_CLIENTS
                                                         .MAX_LENGTHS
                                                         .TWITTER_USERNAME + 2).join('a');

        client.client_instagram_username = new Array(config.EVENID_OAUTH_CLIENTS
                                                           .MAX_LENGTHS
                                                           .INSTAGRAM_USERNAME + 2).join('a');

        makeARequest(client, 302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/clients');

            request.get(resp.headers.location)
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);

                assert.ok(!!resp.text.match(/Name is too long/));
                assert.ok(!!resp.text.match(/Description is too long/));
                assert.ok(!!resp.text.match(/Website is too long/));
                assert.ok(!!resp.text.match(/Facebook username is too long/));
                assert.ok(!!resp.text.match(/Twitter username is too long/));
                assert.ok(!!resp.text.match(/Instagram username is too long/));

                done();
            });
        });
    });

    it('displays errors when invalid client website', function (done) {
        var client = validClient(csrfToken);

        client.client_website = 'ht://foo.com';

        makeARequest(client, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/clients');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);
                
                assert.ok(!!resp.text.match(/Your website URL is not valid/));

                done();
            });
        });
    });

    it('redirects to client page when valid form data', function (done) {
        var client = validClient(csrfToken);

        makeARequest(client, 302, request, function (err, resp) {
            var redirectReg = new RegExp('/clients/' + config.EVENID_MONGODB.OBJECT_ID_PATTERN);
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(redirectReg));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                /* Make sure client form is filled */
                isValidClientPage(client, resp.text);

                done();
            });
        });
    });
});