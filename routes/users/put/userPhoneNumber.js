var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/phone-numbers/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')$');
    
    app.put(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var number = validator.trim(req.body.number);
        var country = validator.trim(req.body.country);

        var userID = req.params[0];
        var phoneNumberID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            updateUserPhoneNumber: function (cb) {
                apiClient.makeRequest('PUT', '/users/' + userID + '/phone-numbers/' + phoneNumberID, {
                    number: number,
                    country: country
                }, function (err, phoneNumber) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, phoneNumber);
                });
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('The phone number has been successfully updated.'));
            req.flash('notification.type', 'success');

            res.redirect(req.path);
        });
    });
};