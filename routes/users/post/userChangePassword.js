var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/change-password$');

    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var currentPassword = validator.trim(req.body.current_password);
        var newPassword = validator.trim(req.body.new_password);

        var userID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            changeUserPassword: function (cb) {
                apiClient.makeRequest('POST', '/users/' + userID + '/change-password', {
                    current_password: currentPassword,
                    new_password: newPassword
                }, function (err, result) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, result);
                });
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('Your password has been successfully updated.'));
            req.flash('notification.type', 'success');

            res.redirect(req.path);
        });
    });
};