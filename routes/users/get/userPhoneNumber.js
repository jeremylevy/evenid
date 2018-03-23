var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/phone-numbers/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var user = req.session.login.user;
        
        var userID = req.params[0];
        var phoneNumberID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            findPhoneNumber: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/phone-numbers/' + phoneNumberID, 
                                      {}, function (err, resp) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            findAuthorizations: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/authorizations'
                                      + '?entity=phone_numbers&entity_id=' + phoneNumberID, 
                                      {}, function (err, authorizations) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, authorizations);
                });
            }
        }, function (err, results) {
            var authorizations = results && results.findAuthorizations;
            var findPhoneNumberResp = results && results.findPhoneNumber;

            if (err) {
                return next(err);
            }

            res.render('users/phoneNumbers', {
                user: user,
                authorizations: authorizations,
                phoneNumbers: [findPhoneNumberResp.phoneNumber],
                phoneNumber: findPhoneNumberResp.phoneNumber,
                territories: findPhoneNumberResp.territories
            });
        });
    });
};