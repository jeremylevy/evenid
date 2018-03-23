var validator = require('validator');
var async = require('async');

var config = require('../../../config');

var checkIfUserIs = require('../middlewares/checkIfUserIs');
var loginPostMiddleware = require('../middlewares/login');

var _apiClient = require('../../../libs/apiClient');

module.exports = function (app, express) {
    app.post('/register', checkIfUserIs('unlogged'), function (req, res, next) {
        var email = validator.trim(req.body.email);
        var password = validator.trim(req.body.password);

        var timezone = validator.trim(req.body.timezone);

        // If recaptcha was displayed for spam purpose
        var recaptchaResponse = validator.trim(req.body['g-recaptcha-response']);

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

            createUser: ['getAccessToken', function (cb, results) {
                apiClient.makeRequest('POST', '/users', {
                    email: email,
                    password: password,
                    timezone: timezone,
                    is_developer: 'true',
                    // If recaptcha was displayed for spam purpose
                    'g-recaptcha-response': recaptchaResponse
                }, function (err, user) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, user);
                });
            }]
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('You are now registered on EvenID.'));
            req.flash('notification.type', 'success');

            loginPostMiddleware(req, res, next);
        });
    });
};