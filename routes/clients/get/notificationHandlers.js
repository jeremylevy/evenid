var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');
var paginate = require('../../users/middlewares/paginate');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/notification-handlers(?:/page/((?:[1-9]+[0-9]*)|last))?$');
    
    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var clientID = req.params[0];
        var currentPage = req.params[1] || 1;

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            findClient: function (cb) {
                apiClient.makeRequest('GET', 
                                      '/clients/' + clientID, 
                                      {}, function (err, client) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, client);
                });
            },

            findClientNotificationHandlers: function (cb) {
                apiClient.makeRequest('GET', 
                                      '/clients/' + clientID + '/hooks', 
                                      {}, function (err, notificationHandlers) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, notificationHandlers);
                });
            }
        }, function (err, results) {
            var client = results && results.findClient;
            var notificationHandlers = results && results.findClientNotificationHandlers;

            if (err) {
                return next(err);
            }

            res.locals.client = client;
            res.locals.notificationHandlers = notificationHandlers.hooks;
            res.locals.eventTypes = notificationHandlers.eventTypes;
            res.locals.maxEntityDisplayed = config.EVENID_OAUTH_CLIENTS
                                                  .MAX_ENTITIES_DISPLAYED
                                                  .NOTIFICATION_HANDLERS;
            res.locals.currentPage = currentPage;
            res.locals.entityName = 'notificationHandlers';

            next();
        });
    }, paginate, function (req, res, next) {
        res.render('clients/notificationHandlers');
    });
};