var assert = require('assert');

var EventEmitter = require('events').EventEmitter;

var ApiClient = require('../../../libs/classes/ApiClient');

var data = require('../../../testUtils/mocks/data/ApiClient');

var validClientID = data.clientID;
var validClientSecret = data.clientSecret;

var validAccessToken = data.accessToken;
var validRefreshToken = data.refreshToken;

var validApiEndpoint = data.apiEndpoint;

var validUserIPAddress = data.userIPAddress;
var validUserLang = data.userLang;

var validApiClient = function () {
    return new ApiClient(validClientID,
                        validClientSecret,
                        validApiEndpoint,
                        validAccessToken,
                        validRefreshToken,
                        validUserIPAddress,
                        validUserLang);
};

describe('libs.classes.ApiClient.constructor', function () {
    it('throws an exception when passing invalid client ID', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                new ApiClient(v, validClientSecret, 
                            validApiEndpoint, 
                            validAccessToken, 
                            validRefreshToken, 
                            validUserIPAddress);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid client secret', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                new ApiClient(validClientID, v, 
                            validApiEndpoint, 
                            validAccessToken, 
                            validRefreshToken, 
                            validUserIPAddress);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid API endpoint', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                new ApiClient(validClientID, 
                            validClientSecret, 
                            v, 
                            validAccessToken, 
                            validRefreshToken, 
                            validUserIPAddress);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid access token', function () {
        [{}, 9, [], 'abcdef6358', 'foo'].forEach(function (v) {
            assert.throws(function () {
                new ApiClient(validClientID, 
                            validClientSecret, 
                            validApiEndpoint,
                            v, 
                            validRefreshToken, 
                            validUserIPAddress,
                            validUserLang);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid refresh token', function () {
        [{}, 9, [], 'abcdef6358', 'foo'].forEach(function (v) {
            assert.throws(function () {
                new ApiClient(validClientID, 
                            validClientSecret, 
                            validApiEndpoint,
                            validAccessToken, 
                            v, 
                            validUserIPAddress,
                            validUserLang);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when access token is set without refresh token', function () {
        assert.throws(function () {
            new ApiClient(validClientID, 
                        validClientSecret, 
                        validApiEndpoint,
                        validAccessToken, 
                        undefined, 
                        validUserIPAddress,
                        validUserLang);
        }, assert.AssertionError);
    });

    it('throws an exception when refresh token is set without access token', function () {
        assert.throws(function () {
            new ApiClient(validClientID, 
                        validClientSecret, 
                        validApiEndpoint,
                        undefined, 
                        validRefreshToken, 
                        validUserIPAddress,
                        validUserLang);
        }, assert.AssertionError);
    });

    it('throws an exception when passing invalid user IP address', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                new ApiClient(validClientID, 
                            validClientSecret, 
                            validApiEndpoint, 
                            validAccessToken, 
                            validRefreshToken, 
                            v,
                            validUserLang);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid user lang', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                new ApiClient(validClientID, 
                            validClientSecret, 
                            validApiEndpoint, 
                            validAccessToken, 
                            validRefreshToken, 
                            validUserIPAddress,
                            v);
            }, assert.AssertionError);
        });
    });

    it('works without access and refresh tokens', function () {
        assert.doesNotThrow(function () {
            new ApiClient(validClientID, 
                        validClientSecret, 
                        validApiEndpoint,
                        undefined, 
                        undefined, 
                        validUserIPAddress,
                        validUserLang);
        }, assert.AssertionError);
    });

    it('inherits from EventEmitter', function () {
        assert.ok(validApiClient() instanceof EventEmitter);
    });

    it('sets instance variables', function () {
        var apiClient = validApiClient();

        assert.strictEqual(apiClient.clientID, validClientID);
        assert.strictEqual(apiClient.clientSecret, validClientSecret);
        
        assert.strictEqual(apiClient.apiEndpoint, validApiEndpoint);
        assert.strictEqual(apiClient.accessToken, validAccessToken);
        
        assert.strictEqual(apiClient.refreshToken, validRefreshToken);
        
        assert.strictEqual(apiClient.userIPAddress, validUserIPAddress);
        assert.strictEqual(apiClient.userLang, validUserLang);
    });
});