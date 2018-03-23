var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

var _apiClient = require('../../../libs/apiClient');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/logos$');

    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var logoURL = validator.trim(req.body.url);

        var clientID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            updateLogo: function (cb) {
                apiClient.makeRequest('PUT', '/clients/' + clientID, {
                    logo: logoURL
                }, function (err, client) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, client);
                });
            }
        }, function (err, results) {
            var client = results && results.updateLogo;

            if (err) {
                return next(err);
            }

            res.send(client);
        });
    });
};