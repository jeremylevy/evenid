var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/authorized-clients/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')$');
    
    app.delete(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var clientName = validator.trim(req.body.client_name);

        var userID = req.params[0];
        var clientID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            deleteUserAuhthorization: function (cb) {
                apiClient.makeRequest('DELETE', '/users/' + userID + '/authorized-clients/' + clientID, 
                                      {}, function (err) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null);
                });
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('update.user', 'YES');

            req.flash('notification', clientName 
                ? req.i18n.__('You are now unsubscribed from %s.', clientName) 
                : req.i18n.__('You are now unsubscribed from this app.'));
            
            req.flash('notification.type', 'success');
            
            res.redirect('/users/' + userID);
        });
    });
};