var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/notification-handlers/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')$');
    
    app.put(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var URL = validator.trim(req.body.url);
        var eventType = validator.trim(req.body.event_type);

        var clientID = req.params[0];
        var notificationID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            updateClientNotification: function (cb) {
                var URI = '/clients/' 
                        + clientID 
                        + '/hooks/' 
                        + notificationID;
                
                apiClient.makeRequest('PUT', URI, {
                    url: URL,
                    event_type: eventType
                }, function (err, notification) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, notification);
                });
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('The notification handler has been successfully updated.'));
            req.flash('notification.type', 'success');
            
            res.redirect(req.path);
        });
    });
};