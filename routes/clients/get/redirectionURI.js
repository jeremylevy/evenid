var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/redirection-uris/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var clientID = req.params[0];
        var user = req.session.login.user;

        var redirectionURIID = req.params[1];

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

            findRedirectionURI: function (cb) {
                var URI = '/clients/' 
                        + clientID 
                        + '/redirection-uris/' 
                        + redirectionURIID;

                apiClient.makeRequest('GET', URI, 
                                      {}, function (err, redirectionURI) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, redirectionURI);
                });
            }
        }, function (err, results) {
            var client = results && results.findClient;
            var redirectionURI = results && results.findRedirectionURI;

            if (err) {
                return next(err);
            }

            res.render('clients/redirectionURIs', {
                client: client,
                redirectionURIs: [redirectionURI],
                redirectionURI: redirectionURI
            });
        });
    });
};