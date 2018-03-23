var querystring = require('querystring');

var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var checkIfUserIs = require('./checkIfUserIs');

var loginPostMiddleware = require('./login');
var authorizePostMiddleware = require('../../oauth/middlewares/authorizePost');

var getOauthFlowForUserDependingOnAuth = require('../callbacks/getOauthFlowForUserDependingOnAuth');

var _apiClient = require('../../../libs/apiClient');

module.exports = function (usedDuringOauthAuth) {
    return [checkIfUserIs('unlogged'), function (req, res, next) {
        var code = !usedDuringOauthAuth 
                        ? req.params[0] 
                        : validator.trim(req.query.code);

        var email = validator.trim(req.body.email);
        var newPassword = validator.trim(req.body.password);

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

            resetPassword: ['getAccessToken', function (cb) {
                apiClient.makeRequest('POST', '/users/recover-password/' + code, {
                    password: newPassword,
                    client: usedDuringOauthAuth ? req.query.client_id : ''
                }, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            var resetPasswordResp = results && results.resetPassword;
            var query = req.query;

            if (err) {
                return next(err);
            }

            req.flash('notification.type', 'success');
            req.flash('notification', req.i18n.__('Your password has been updated.'));

            /* Log user */

            if (usedDuringOauthAuth) {
                // Redirect to best flow for user 
                // (registration if not authorized, login otherwise)
                query.flow = resetPasswordResp.next_flow;

                delete query.code;

                authorizePostMiddleware.call({
                    // Make sure user will not be redirected 
                    // immediatly to client redirect URI 
                    // without seeing password update notification
                    successCallback: function () {
                        res.redirect(req.path + '?' + querystring.stringify(query));
                    }
                }, req, res, next);

                return;
            }
            
            loginPostMiddleware(req, res, next);
        });
    }];
};