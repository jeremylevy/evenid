var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/emails$');
    
    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var email = validator.trim(req.body.email);
        var password = validator.trim(req.body.password);
        var isMainAddress = validator.trim(req.body.is_main_address) === 'true' 
                                ? 'true' 
                                : 'false';

        var userID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            createUserEmail: function (cb) {
                apiClient.makeRequest('POST', '/users/' + userID + '/emails', {
                    email: email,
                    password: password,
                    is_main_address: isMainAddress
                }, function (err, email) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, email);
                });
            }
        }, function (err, results) {
            var createdEmail = results && results.createUserEmail;

            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('The email has been successfully created.'));
            req.flash('notification.type', 'success');

            if (config.ENV === 'test') {
                return res.redirect(req.path + '/' + createdEmail.id);
            }

            res.redirect(req.path + '/page/last');
        });
    });
};