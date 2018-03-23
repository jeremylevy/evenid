var querystring = require('querystring');

var validator = require('validator');
var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('./checkIfUserIs');

module.exports = function (usedDuringOauthAuth) {
    return [checkIfUserIs('unlogged'), function (req, res, next) {
        var email = validator.trim(req.body.email);

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT);

        var dataToSend = {
            email: email
        };

        if (usedDuringOauthAuth) {
            dataToSend.client = res.locals.client.id;
            dataToSend.query = req.query;
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

            resetPassword: ['getAccessToken', function (cb, results) {
                apiClient.makeRequest('POST', '/users/recover-password', 
                                      dataToSend, function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            var resetPasswordResp = results && results.resetPassword;
            var redirectTo = req.path;

            if (err) {
                return next(err);
            }

            if (config.ENV === 'test') {
                redirectTo += '?code=' + resetPasswordResp.code;
            }

            // Used during oauth authorize
            if (usedDuringOauthAuth) {
                if (config.ENV !== 'test') {
                    redirectTo += '?';
                } else {
                    redirectTo += '&';
                }

                redirectTo += querystring.stringify(req.query);
            }

            req.flash('notification.type', 'success');
            req.flash('notification', req.i18n.__('An email containing a link to reset '
                                                + 'your password has just been sent to the '
                                                + 'address you provided.'));

            res.redirect(redirectTo);
        });
    }];
};