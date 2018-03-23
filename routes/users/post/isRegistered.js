var validator = require('validator');
var async = require('async');

var config = require('../../../config');

var checkIfUserIs = require('../middlewares/checkIfUserIs');
var loginPostMiddleware = require('../middlewares/login');

var _apiClient = require('../../../libs/apiClient');

module.exports = function (app, express) {
    app.post('/users/is-registered',
             checkIfUserIs('unlogged'),
             function (req, res, next) {
        
        var email = validator.trim(req.body.email);

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

            checkIfRegistered: ['getAccessToken', function (cb, results) {
                apiClient.makeRequest('POST', '/users/is-registered', {
                    email: email
                }, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    if (resp.is_registered) {
                        // Prefill recover password form email field
                        req.session.recoverPassword = {
                            email: req.body.email
                        };
                    }

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            var checkIfRegisteredResp = results && results.checkIfRegistered;

            if (err) {
                return next(err);
            }

            // Ajax
            res.send(checkIfRegisteredResp);
        });
    });
};