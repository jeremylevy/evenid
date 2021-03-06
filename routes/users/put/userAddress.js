var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/addresses/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')$');
    
    app.put(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var addressType = validator.trim(req.body.address_type);
        var fullName = validator.trim(req.body.full_name);
        var addressLine1 = validator.trim(req.body.address_line_1);
        var addressLine2 = validator.trim(req.body.address_line_2);
        var accessCode = validator.trim(req.body.access_code);
        var city = validator.trim(req.body.city);
        var state = validator.trim(req.body.state);
        var postalCode = validator.trim(req.body.postal_code);
        var country = validator.trim(req.body.country);

        var userID = req.params[0];
        var addressID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            updateUserAddress: function (cb) {
                apiClient.makeRequest('PUT', '/users/' + userID + '/addresses/' + addressID, {
                    full_name: fullName,
                    address_line_1: addressLine1,
                    address_line_2: addressLine2,
                    access_code: accessCode,
                    city: city,
                    state: state,
                    postal_code: postalCode,
                    country: country,
                    address_type: addressType
                }, function (err, address) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, address);
                });
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('The address has been successfully updated.'));
            req.flash('notification.type', 'success');

            res.redirect(req.path);
        });
    });
};