var assert = require('assert');

var EventEmitter = require('events').EventEmitter;

//var ApiClient = require('../../../libs/classes/ApiClient');
var apiClient = require('../../libs/apiClient');

var data = require('../../testUtils/mocks/data/ApiClient');

var validClientID = data.clientID;
var validClientSecret = data.clientSecret;

var validAccessToken = data.accessToken;
var validRefreshToken = data.refreshToken;

var refreshedAccessToken = data.refreshedAccessToken;
var refreshedRefreshToken = data.refreshedRefreshToken;

var validApiEndpoint = data.apiEndpoint;

var validUserIPAddress = data.userIPAddress;
var validUserLang = data.userLang;

var validUserID = data.userID;

var validReq = function () {
    return {
        i18n: {
            getLocale: function () {
                return validUserLang;
            }
        },

        ip: validUserIPAddress,

        session: {
            login: {
                user: {}
            }
        },

        signedCookies: {}
    };
};

var validRes = function () {
    return {
        cookie: function () {}
    };
};

var validApiClient = function (validReq) {
    return apiClient(validReq,
                    validRes(),
                    validClientID,
                    validClientSecret, 
                    validApiEndpoint, 
                    validAccessToken, 
                    validRefreshToken);
};

require('../../testUtils/mocks/lib/apiClient');

describe('libs.apiClient', function () {
    it('throws an exception when passing invalid req', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                apiClient(v,
                        validRes(),
                        validClientID,
                        validClientSecret, 
                        validApiEndpoint, 
                        validAccessToken, 
                        validRefreshToken);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid res', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                apiClient(validReq(),
                        v,
                        validClientSecret, 
                        validApiEndpoint, 
                        validAccessToken, 
                        validRefreshToken);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid client ID', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                apiClient(validReq(),
                        validRes(),
                        v,
                        validClientSecret, 
                        validApiEndpoint, 
                        validAccessToken, 
                        validRefreshToken);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid client secret', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                apiClient(validReq(),
                        validRes(),
                        validClientID,
                        v, 
                        validApiEndpoint, 
                        validAccessToken, 
                        validRefreshToken);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid api endpoint', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                apiClient(validReq(),
                        validRes(),
                        validClientID,
                        validClientSecret, 
                        v, 
                        validAccessToken, 
                        validRefreshToken);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid access token', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                apiClient(validReq(),
                        validRes(),
                        validClientID,
                        validClientSecret, 
                        validApiEndpoint, 
                        v, 
                        validRefreshToken);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid refresh token', function () {
        [null, undefined, {}, 9, [], '', 'foo'].forEach(function (v) {
            assert.throws(function () {
                apiClient(validReq(),
                        validRes(),
                        validClientID,
                        validClientSecret, 
                        validApiEndpoint, 
                        validAccessToken, 
                        v);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when access token is set without refresh token', function () {
        assert.throws(function () {
            apiClient(validReq(),
                    validRes(),
                    validClientID,
                    validClientSecret, 
                    validApiEndpoint, 
                    validAccessToken, 
                    undefined);
        }, assert.AssertionError);
    });

    it('throws an exception when refresh token is set without access token', function () {
        assert.throws(function () {
            apiClient(validReq(),
                    validRes(),
                    validClientID,
                    validClientSecret, 
                    validApiEndpoint, 
                    undefined, 
                    validRefreshToken);
        }, assert.AssertionError);
    });

    it('works without access and refresh tokens', function () {
        assert.doesNotThrow(function () {
            apiClient(validReq(),
                    validRes(),
                    validClientID,
                    validClientSecret, 
                    validApiEndpoint, 
                    undefined, 
                    undefined);
        }, assert.AssertionError);
    });

    it('refreshes session when `expired_token` is '
       + 'returned by API for unauthorized app token', function (done) {
        
        var _validReq = validReq();
        var apiClient = validApiClient(_validReq);

        apiClient.makeRequest('GET', '/test-expired-token-for-unauthorized-app', {}, function (err, resp) {
            var session = _validReq.session.unauthenticated_tokens;

            assert.strictEqual(session.access_token, refreshedAccessToken);
            assert.strictEqual(session.refresh_token, refreshedRefreshToken);

            done();
        });
    });

    it('refreshes session when `expired_token` is '
       + 'returned by API for authorized app token', function (done) {
        
        var _validReq = validReq();
        var apiClient = validApiClient(_validReq);
        
        apiClient.makeRequest('GET', '/test-expired-token-for-authorized-app', {}, function (err, resp) {
            var session = _validReq.session.login;

            assert.strictEqual(session.access_token, refreshedAccessToken);
            assert.strictEqual(session.refresh_token, refreshedRefreshToken);
            assert.strictEqual(session.user_id, validUserID);

            done();
        });
    });

    it('sets unauthenticated tokens in session when '
       + 'oauth token endpoint was called the first time '
       + 'with `client_credentials` grant type', function (done) {

        var _validReq = validReq();
        var _apiClient = null;

        _validReq.session.unauthenticated_tokens = undefined;

        _apiClient = apiClient(_validReq,
                                validRes(),
                                validClientID,
                                validClientSecret, 
                                validApiEndpoint, 
                                undefined, 
                                undefined);

        _apiClient.makeRequest('POST', '/oauth/token', {
            grant_type: 'client_credentials'
        }, function (err, resp) {
            var session = _validReq.session.unauthenticated_tokens;

            assert.strictEqual(session.access_token, refreshedAccessToken);
            assert.strictEqual(session.refresh_token, refreshedRefreshToken);

            assert.deepEqual(resp, session);

            done();
        });
    });

    it('reuses unauthenticated tokens present '
       + 'in session when trying to get another pair', function (done) {

        var _validReq = validReq();
        var _apiClient = null;

        _validReq.session.unauthenticated_tokens = {
            access_token: refreshedAccessToken,
            refresh_token: refreshedRefreshToken
        };

        _apiClient = apiClient(_validReq,
                                validRes(),
                                validClientID,
                                validClientSecret, 
                                validApiEndpoint, 
                                undefined, 
                                undefined);

        _apiClient.makeRequest('POST', '/oauth/token', {
            grant_type: 'client_credentials'
        }, function (err, resp) {
            assert.deepEqual(resp, _validReq.session.unauthenticated_tokens);

            done();
        });
    });
});