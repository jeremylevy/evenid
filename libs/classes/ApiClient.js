var net = require('net');
var assert = require('assert');

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Type = require('type-of-is');

var request = require('request');
var validator = require('validator');

var config = require('../../config');

var ApiError = require('../../errors/types/ApiError');

var areValidObjectIDs = require('../validators/areValidObjectIDs')
                               (config.EVENID_MONGODB.OBJECT_ID_PATTERN);

var isValidClientSecret = require('../validators/isValidClientSecret');
var isValidOauthToken = require('../validators/isValidOauthToken');

// Extends ApiClient class with EventEmitter
util.inherits(ApiClient, EventEmitter);

function ApiClient (clientID, clientSecret, 
                    apiEndpoint, accessToken, 
                    refreshToken, userIPAddress,
                    userLang) {

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

    assert.ok(net.isIP(userIPAddress),
              'argument `userIPAddress` is invalid');

    assert.ok(config.EVENID_LOCALES
                    .ENABLED
                    .indexOf(userLang) !== -1,
              'argument `userLang` is invalid');
    
    // Call EventEmitter constructor
    EventEmitter.call(this);

    this.clientID = clientID;
    this.clientSecret = clientSecret;

    this.apiEndpoint = apiEndpoint;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    this.userIPAddress = userIPAddress;
    this.userLang = userLang;

    this.isRefreshingToken = false;
    this.fnsAfterRefreshingToken = [];
}

ApiClient.prototype.makeRequest = function (method, path, data, cb) {
    assert.ok(Type.is(method, String) 
              && ['GET', 'POST', 'PUT', 'DELETE'].indexOf(method.toUpperCase()) !== -1,
              'argument `method` is invalid');

    assert.ok(Type.is(path, String) && path.length,
              'argument `path` is invalid');

    assert.ok(Type.is(data, Object),
              'argument `data` must be an object');

    assert.ok(Type.is(cb, Function),
              'argument `cb` must be a function');

    var self = this;
    var selfArgs = Array.prototype.slice.call(arguments);
    var opts = {};

    // Remove leading and trailing `/` from path
    path = path.replace(/^\//, '');
    path = path.replace(/\/$/, '');

    method = method.toUpperCase();

    opts = {
        method: method,
        uri: this.apiEndpoint.replace(/\/$/, '') + '/' + path,
        headers: {
            'X-Originating-IP': this.userIPAddress
        },
        // Fix unauthorized cert error
        // See https://github.com/nodejs/node-v0.x-archive/issues/8894
        rejectUnauthorized: false
    };

    if (path === 'oauth/token') {
        opts.headers.Authorization = 'Basic ' 
                                        + new Buffer(this.clientID 
                                        + ':' 
                                        + this.clientSecret).toString('base64');
    } else if (this.accessToken) {
        opts.headers.Authorization = 'Bearer ' + this.accessToken;
    }

    if (method !== 'GET') {
        opts.form = data;
    } else {
        opts.qs = data;
    }

    if (!opts.qs) {
        opts.qs = {};
    }

    opts.qs['lang'] = this.userLang;

    //console.log(path);
    
    request(opts, function (error, response, body) {
        var results = null;
        var handleError = function (results, cb) {
            // According to spec, error during Oauth token flow 
            // MUST returns `error` and optionaly `error_description` property
            // Error in Api request returns error.type & error.messages
            return cb(new ApiError(results.error.type || results.error, 
                                   results.error.messages || (delete results.error && results)));
        };

        if (error) {
            return cb(error);
        }

        try {
            //console.log(body);

            results = JSON.parse(body);

            if (response.statusCode !== 200) {
                // Access token has expired
                // Try to refresh it
                if (results.error.type === 'expired_token'
                    && self.refreshToken
                    && path !== 'oauth/token') {

                    // In case of concurrent requests
                    // Recall all functions which have waited
                    // for access token to be refreshed
                    self.fnsAfterRefreshingToken.push(function (err) {
                        if (err) {
                            return handleError(results, cb);
                        }

                        self.makeRequest.apply(self, selfArgs);
                    });

                    // In case of concurrent requests
                    // wait for access token to be refreshed
                    if (self.isRefreshingToken) {
                        return;
                    }

                    self.isRefreshingToken = true;

                    return self.makeRequest('POST', '/oauth/token', {
                        grant_type: 'refresh_token',
                        refresh_token: self.refreshToken
                    }, function (err, resp) {
                        
                        self.isRefreshingToken = false;

                        // If we cannot refresh access token
                        // Pass the first `expired_token` error
                        if (err) {
                            self.fnsAfterRefreshingToken.forEach(function (fn) {
                                fn(err);
                            });

                            self.fnsAfterRefreshingToken = [];
                            
                            return;
                        }

                        // Update instance variables
                        self.accessToken = resp.access_token;
                        self.refreshToken = resp.refresh_token;

                        // Emit an event to give a chance
                        // to constructor to update session
                        self.emit('didUpdateTokens', resp);

                        // Recall all functions which have waited
                        // for access token to be refreshed
                        self.fnsAfterRefreshingToken.forEach(function (fn) {
                            fn();
                        });

                        self.fnsAfterRefreshingToken = [];
                    });
                }

                return handleError(results, cb);
            }

            return cb(null, results);
        } catch (e) {
            // The API has returned invalid JSON
            // -> Uncaught exception
            if (config.ENV !== 'test') {
                console.error(e);
            }

            return cb(new ApiError('server_error'));
        }
    });
};

module.exports = ApiClient;