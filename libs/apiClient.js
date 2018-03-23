var assert = require('assert');
var Type = require('type-of-is');

var url = require('url');
var validator = require('validator');

var config = require('../config');

var ApiClient = require('./classes/ApiClient');

var setUnauthenticatedTokens = require('../routes/users/callbacks/setUnauthenticatedTokens');
var setUserAsLogged = require('../routes/users/callbacks/setUserAsLogged');

var areValidObjectIDs = require('./validators/areValidObjectIDs')
                               (config.EVENID_MONGODB.OBJECT_ID_PATTERN);

var isValidClientSecret = require('./validators/isValidClientSecret');
var isValidOauthToken = require('./validators/isValidOauthToken');

module.exports = function (req, res, clientID, clientSecret, 
                           apiEndpoint, accessToken, refreshToken) {
    
    assert.ok(req 
              && req.i18n 
              && req.i18n.getLocale
              && req.ip
              && req.session
              && req.signedCookies,
              'argument `req` is invalid');

    assert.ok(res && res.cookie,
              'argument `res` is invalid');

    assert.ok(areValidObjectIDs([clientID]),
              'argument `clientID` must be an ObjectID');

    assert.ok(isValidClientSecret(clientSecret),
              'argument `clientSecret` is invalid');

    /*assert.ok(validator.isURL(apiEndpoint),
              'argument `apiEndpoint` is invalid');*/

    if (!accessToken) {
        assert.ok(!refreshToken);
    } else {
        assert.ok(isValidOauthToken(accessToken),
                  'argument `accessToken` is invalid');

        assert.ok(isValidOauthToken(refreshToken),
                  'argument `refreshToken` is invalid');
    }
    
    var currentLocale = req.i18n.getLocale();
    var enabledLocales = config.EVENID_LOCALES.ENABLED;

    var parsedApiEndpoint = url.parse(apiEndpoint);
    var apiClient = null;
    var makeRequestFn = null;
    
    apiClient = new ApiClient(clientID, clientSecret, apiEndpoint, 
                              accessToken, refreshToken, req.ip,
                              req.i18n.getLocale());

    // Unauthenticated methods
    if (!accessToken && !refreshToken) {
        makeRequestFn = apiClient.makeRequest;
        
        // Hook the `makeRequest` method
        // to set unauthenticated tokens in session
        // the first time and to reuse it other times.
        apiClient.makeRequest = function (method, path, data, cb) {
            var args = Array.prototype.slice.call(arguments);
            var originalCb = cb;

            // We want unauthenticated tokens
            if (path === '/oauth/token'
                && data 
                && data.grant_type === 'client_credentials') {

                // Reuse it
                if (req.session.unauthenticated_tokens) {
                    return cb(null, req.session.unauthenticated_tokens);
                }

                // Hook callback to set unauthenticated 
                // tokens in session
                args[args.length - 1] = function (err, resp) {
                    if (err) {
                        return originalCb(err, resp);
                    }

                    setUnauthenticatedTokens(req, resp);

                    originalCb(err, resp);
                };
            }

            // Make sure `this` 
            // was set to instance class
            makeRequestFn.apply(apiClient, args);
        };
        
        return apiClient;
    }

    // Api client has used refresh token
    // in order to obtain new access token
    apiClient.on('didUpdateTokens', function (refreshAccessTokenResp) {
        if (!refreshAccessTokenResp.user_id) {
            setUnauthenticatedTokens(req, refreshAccessTokenResp);

            return;
        }

        setUserAsLogged(req, 
                        res, 
                        // {"access_token": ..., "refresh_token": ...}
                        refreshAccessTokenResp,
                        // Keep the same user on session
                        req.session.login.user,
                        // Update persistent login cookie 
                        // with refresh token if cookie already exists
                        !!req.signedCookies[config.EVENID_PERSISTENT_LOGIN_COOKIE.name]);
    });

    return apiClient;
};