var assert = require('assert');
var querystring = require('querystring');

var mongoose = require('mongoose');
var Type = require('type-of-is');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

var testInvalidEntityResp = function (msg, done) {
    return function (err, resp) {
        var error = resp && resp.body;
            
        if (err) {
            return done(err);
        }

        assert.doesNotThrow(function () {
            JSON.parse(resp.text);
        });

        assert.strictEqual(error.type, 'invalid_request');
        assert.strictEqual(error.messages.entity, msg);

        done();
    };
};

var testSuccessResp = function (done) {
    return function (err, resp) {
        var respBody = resp && resp.body;

        if (err) {
            return done(err);
        }

        assert.ok(Type.is(respBody, Object));

        assert.ok(Type.is(respBody.uploadPolicy, Object));
        assert.ok(Object.keys(respBody.uploadPolicy).length > 0);

        assert.ok(Type.is(respBody.formAction, String));
        assert.ok(respBody.formAction.length > 0);

        done();
    };
};

describe('GET /upload-policy', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (qs, statusCode, request, cb) {
                request
                    .get('/upload-policy?' + querystring.stringify(qs))
                    .set('X-Requested-With', 'XMLHttpRequest')
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

    it('returns JSON object with errors '
       + 'when user is unlogged', function (done) {
        
        getUnloggedRequest(function (err, resp) {
            var request = resp.request;

            if (err) {
                return done(err);
            }

            makeARequest({}, 403, request, function (err, resp) {
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

    it('returns invalid request error '
       + 'when empty query string', function (done) {
        
        makeARequest({}, 400, request, 
                     testInvalidEntityResp('The "entity" parameter must '
                                           + 'be set in querystring.', done));
    });

    it('returns invalid request error '
       + 'when invalid entity', function (done) {
        
        makeARequest({
            entity: 'bar'
        }, 400, request,
        testInvalidEntityResp('The "entity" parameter is invalid.', done)); 
    });

    it('sends upload policy as JSON '
       + 'for user entity', function (done) {
        
        makeARequest({
            entity: 'user'
        }, 200, request, testSuccessResp(done));
    });

    it('sends upload policy as JSON '
       + 'for client entity', function (done) {
       
        makeARequest({
            entity: 'client'
        }, 200, request, testSuccessResp(done));
    });

    // In test env, limit is set to two requests
    // per 24h so test after the two successful request
    it('returns max attempts reached '
       + 'error when too many attempts', function (done) {
        
        makeARequest({
            entity: 'user'
        }, 400, request, function (err, resp) {
            var error = resp && resp.body;
                
            if (err) {
                return done(err);
            }

            assert.doesNotThrow(function () {
                JSON.parse(resp.text);
            });

            assert.strictEqual(error.type, 'max_attempts_reached');

            done();
        });
    });
});