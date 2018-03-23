var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/notification-handlers$');
    
    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var clientID = req.params[0];
        var URL = validator.trim(req.body.url);
        var eventType = validator.trim(req.body.event_type);

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            createOauthClientHook: function (cb) {
                apiClient.makeRequest('POST', '/clients/' + clientID + '/hooks', {
                    url: URL,
                    event_type: eventType
                }, function (err, hook) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, hook);
                });
            }
        }, function (err, results) {
            var createdHook = results && results.createOauthClientHook;

            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('The notification handler has been successfully created.'));
            req.flash('notification.type', 'success');

            if (config.ENV === 'test') {
                return res.redirect(req.path + '/' + createdHook.id);
            }
            
            res.redirect(req.path + '/page/last');
        });
    });
};