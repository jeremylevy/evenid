var async = require('async');
var validator = require('validator')

var config = require('../../../config');

var checkIfUserIs = require('./checkIfUserIs');

var _apiClient = require('../../../libs/apiClient');

module.exports = function (usedDuringOauthAuth) {
    return [checkIfUserIs('unlogged'), function (req, res, next) {
        var code = !usedDuringOauthAuth
            ? req.params[0] 
            : validator.trim(req.query.code);

        var apiClient = _apiClient(req, res,
                                    config.EVENID_APP.CLIENT_ID, 
                                    config.EVENID_APP.CLIENT_SECRET, 
                                    config.EVENID_API.ENDPOINT);

        async.auto({
            getAccessToken: function (cb) {
                apiClient.makeRequest('POST', '/oauth/token', {
                    grant_type: 'client_credentials'
                }, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    apiClient = _apiClient(req, res,
                                            config.EVENID_APP.CLIENT_ID, 
                                            config.EVENID_APP.CLIENT_SECRET, 
                                            config.EVENID_API.ENDPOINT,
                                            resp.access_token,
                                            resp.refresh_token);


                    cb(null, resp);
                });
            },

            validateCode: ['getAccessToken', function (cb) {
                apiClient.makeRequest('GET', '/users/recover-password/' + code, 
                                        {}, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            var validateCodeResp = results && results.validateCode;

            if (err) {
                return next(err);
            }
            
            res.render(usedDuringOauthAuth 
                        ? 'oauth/authorize/recoverPassword' 
                        : 'users/recoverPassword', {
                email: validateCodeResp.email,
                code: code
            });
        });
    }];
};