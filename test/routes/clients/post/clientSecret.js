var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');

var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('POST /clients/:client_id/client-secret', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, data, statusCode, request, cb) {
                var req = request
                            .post('/clients/' 
                                  + clientID 
                                  + '/client-secret')
                            // Used through Ajax
                            .set('X-Requested-With', 'XMLHttpRequest')
                            // Body parser middleware need it 
                            // in order to populate req.body
                            .set('Content-Type', 'application/x-www-form-urlencoded')
                            .send(data)
                            .expect('Content-Type', 'application/json; charset=utf-8')
                            .expect(statusCode);

                req.end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            };

            done();
        });
    });

    it('returns JSON object with errors '
       + 'when user is unlogged', function (done) {
        
        // We don't need to create client because 
        // redirect to login page occurs before the deletion
        var clientID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, {
                _csrf: csrfToken
            }, 403, request, function (err, resp) {
                var error = resp && resp.body;

                if (err) {
                    return done(err);
                }

                assert.doesNotThrow(function () {
                    JSON.parse(resp.text);
                });

                assert.strictEqual(error.type, 'access_denied');
                assert.strictEqual(error.messages.main, 'You are not authorized to access this resource.');

                done();
            });
        });
    });

    it('returns JSON object with errors '
       + 'when empty user password', function (done) {
        
        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            makeARequest(client.id, {
                _csrf: csrfToken
            }, 400, request, function (err, resp) {
                var error = resp && resp.body;
                
                if (err) {
                    return done(err);
                }

                assert.doesNotThrow(function () {
                    JSON.parse(resp.text);
                });

                assert.strictEqual(error.type, 'invalid_request');
                assert.strictEqual(error.messages.user_password, 'Your password must be set.');

                done();
            });
        });
    });

    it('returns JSON object with errors '
       + ' when invalid user password', function (done) {
        
        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            makeARequest(client.id, {
                user_password: 'bar',
                _csrf: csrfToken
            }, 400, request, function (err, resp) {
                var error = resp && resp.body;

                if (err) {
                    return done(err);
                }

                assert.doesNotThrow(function () {
                    JSON.parse(resp.text);
                });

                assert.strictEqual(error.type, 'invalid_request');
                assert.strictEqual(error.messages.user_password, 'Your password is invalid.');

                done();
            });
        });
    });

    it('returns client secret in JSON '
       + 'object when valid user password', function (done) {

        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            makeARequest(client.id, {
                user_password: user.password,
                _csrf: csrfToken
            }, 200, request, function (err, resp) {
                var obj = resp && resp.body;

                if (err) {
                    return done(err);
                }

                assert.doesNotThrow(function () {
                    JSON.parse(resp.text);
                });

                assert.ok(obj.client_secret.length > 0);

                done();
            });
        });
    });
});