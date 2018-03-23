var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/phone-numbers$');
    
    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var number = validator.trim(req.body.number);
        var country = validator.trim(req.body.country);

        var userID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            createUserPhoneNumber: function (cb) {
                apiClient.makeRequest('POST', '/users/' + userID + '/phone-numbers', {
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
            var createdPhoneNumber = results && results.createUserPhoneNumber;

            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('The phone number has been successfully created.'));
            req.flash('notification.type', 'success');

            if (config.ENV === 'test') {
                return res.redirect(req.path + '/' + createdPhoneNumber.id);
            }

            res.redirect(req.path + '/page/last');
        });
    });
};