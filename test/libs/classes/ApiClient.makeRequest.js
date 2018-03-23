var assert = require('assert');

var EventEmitter = require('events').EventEmitter;

var ApiClient = require('../../../libs/classes/ApiClient');
var ApiError = require('../../../errors/types/ApiError');

var data = require('../../../testUtils/mocks/data/ApiClient');

var validClientID = data.clientID;
var validClientSecret = data.clientSecret;

var validAccessToken = data.accessToken;
var validRefreshToken = data.refreshToken;

var refreshedAccessToken = data.refreshedAccessToken;
var refreshedRefreshToken = data.refreshedRefreshToken;

var validApiEndpoint = data.apiEndpoint;

var validUserIPAdddress = data.userIPAddress;
var validUserLang = data.userLang;

var httpMethods = ['get', 'post', 'put', 'delete'];
var httpPaths = [
    '/test', '/test-error',
    '/test-oauth-error', '/test-server-error'
];

var dataToSend = {
    foo: 'bar',
    bar: 'foo'
};

require('../../../testUtils/mocks/lib/classes/ApiClient');

var validApiClient = function () {
    return new ApiClient(validClientID,
                        validClientSecret,
                        validApiEndpoint,
                        validAccessToken,
                        validRefreshToken,
                        validUserIPAdddress,
                        validUserLang);
};

describe('libs.classes.ApiClient.makeRequest', function () {
    it('throws an exception when passing invalid method', function () {
        var apiClient = validApiClient();

        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                apiClient.makeRequest(v, '/', {}, function () {});
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid path', function () {
        var apiClient = validApiClient();

        [null, undefined, {}, 9, [], ''].forEach(function (v) {
            assert.throws(function () {
                apiClient.makeRequest('POST', v, {}, function () {});
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid data', function () {
        var apiClient = validApiClient();

        [null, undefined, 9, [], '', 'bar'].forEach(function (v) {
            assert.throws(function () {
                apiClient.makeRequest('POST', '/', v, function () {});
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid callback', function () {
        var apiClient = validApiClient();

        [null, undefined, 9, {}, [], '', 'bar'].forEach(function (v) {
            assert.throws(function () {
                apiClient.makeRequest('POST', '/', {}, v);
            }, assert.AssertionError);
        });
    });

    httpMethods.forEach(function (httpMethod) {
        
        httpPaths.forEach(function (httpPath) {
            
            it('makes a request to ' + httpMethod.toUpperCase() + ' ' + httpPath, function (done) {
                var apiClient = validApiClient();

                apiClient.makeRequest(httpMethod, httpPath, 
                                      dataToSend, function (err, resp) {
                    
                    if (!!httpPath.match(/error/)) {
                        assert.ok(err && !resp);
                        assert.ok(err instanceof ApiError);

                        if (httpPath === '/test-error') {
                            assert.strictEqual(err.kind, 'invalid_token');
                            assert.deepEqual(err.messages, {main: 'Your access token is invalid.'});
                        } else if (httpPath === '/test-oauth-error') {
                            assert.strictEqual(err.kind, 'invalid_grant');
                            assert.deepEqual(err.messages, {
                                invalid_email: true,
                                invalid_password: false
                            });
                        } else {
                            assert.strictEqual(err.kind, 'server_error');
                            assert.deepEqual(err.messages, {});
                        }

                        done();

                        return;
                    }

                    assert.ok(!err && resp);
                    assert.deepEqual(resp, {status: 'ok'});

                    done();
                });
            });
        });
    });

    it('refreshes token when `expired_token` is returned by API', function (done) {
        var apiClient = validApiClient();
        var didUpdateTokensEventTriggered = false;

        apiClient.on('didUpdateTokens', function (refreshAccessTokenResp) {
            assert.strictEqual(refreshAccessTokenResp.access_token, refreshedAccessToken);
            assert.strictEqual(refreshAccessTokenResp.refresh_token, refreshedRefreshToken);

            didUpdateTokensEventTriggered = true;
        });

        apiClient.makeRequest('GET', '/test-expired-token', {}, function (err, resp) {
            assert.ok(!err && resp);
            assert.deepEqual(resp, {status: 'ok'});

            assert.strictEqual(didUpdateTokensEventTriggered, true);

            done();
        });
    });
});