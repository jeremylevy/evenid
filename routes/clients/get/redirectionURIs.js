var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');
var paginate = require('../../users/middlewares/paginate');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/redirection-uris(?:/page/((?:[1-9]+[0-9]*)|last))?$');
    
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
                apiClient.makeRequest('GET', '/clients/' + clientID, 
                                      {}, function (err, client) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, client);
                });
            },

            findClientRedirectionURIs: function (cb) {
                var URI = '/clients/' 
                        + clientID 
                        + '/redirection-uris';

                apiClient.makeRequest('GET', URI,
                                      {}, function (err, redirectionURIs) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, redirectionURIs);
                });
            }
        }, function (err, results) {
            var client = results && results.findClient;
            var redirectionURIs = results && results.findClientRedirectionURIs;

            if (err) {
                return next(err);
            }

            res.locals.client = client;
            res.locals.redirectionURIs = redirectionURIs;
            res.locals.maxEntityDisplayed = config.EVENID_OAUTH_CLIENTS
                                                  .MAX_ENTITIES_DISPLAYED
                                                  .REDIRECTION_URIS;
            res.locals.currentPage = currentPage;
            res.locals.entityName = 'redirectionURIs';

            next();
        });
    }, paginate, function (req, res, next) {
        res.render('clients/redirectionURIs');
    });
};