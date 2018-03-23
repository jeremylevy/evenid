var querystring = require('querystring');

var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient')

module.exports = function (needsCode) {
    return function (req, res, next) {
        var code = validator.trim(req.query.code);
        var flow = validator.trim(req.query.flow);

        var stringifiedQS = querystring.stringify(req.query);

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT);

        if (flow !== 'recover_password'
            || needsCode && !code
            || !needsCode && code) {

            return next('route');
        }

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

            validateRequestData: ['getAccessToken', function (cb) {
                var path = '/oauth/authorize/recover-password?' + stringifiedQS;

                apiClient.makeRequest('GET', path, {}, function (err, requestData) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, requestData);
                });
            }]
        }, function (err, results) {
            var requestData = results && results.validateRequestData;
            
            if (err) {
                return next(err);
            }

            // Give access to next middlewares
            res.locals.client = requestData.client;
            res.locals.flow = requestData.flow;

            next();
        });
    };
};