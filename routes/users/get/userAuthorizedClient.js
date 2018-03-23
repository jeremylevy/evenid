var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/authorized-clients/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];
        var clientID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            findAuthorizedClient: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/authorized-clients/' + clientID, 
                                      {}, function (err, authorizedClient) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, authorizedClient);
                });
            }
        }, function (err, results) {
            var authorizedClient = results && results.findAuthorizedClient;

            if (err) {
                return next(err);
            }

            res.render('users/authorizedClient', {
                client: authorizedClient.client,
                authorizedUser: authorizedClient.authorizedUser
            });
        });
    });
};