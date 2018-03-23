var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/statistics/test-accounts$');
    
    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var clientID = req.params[0];

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

            findClientStatistics: function (cb) {
                apiClient.makeRequest('GET', '/clients/' + clientID 
                                            + '/statistics/test-accounts/today', 
                                      {}, function (err, stats) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, stats);
                });
            }
        }, function (err, results) {
            var client = results && results.findClient;
            var stats = results && results.findClientStatistics;

            if (err) {
                return next(err);
            }

            res.render('clients/statisticsTestAccounts', {
                client: client,
                stats: stats
            });
        });
    });
};