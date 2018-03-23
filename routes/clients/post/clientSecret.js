var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/client-secret$');
    
    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userPassword = validator.trim(req.body.user_password);

        var clientID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            findClientSecret: function (cb) {
                var URI = '/clients/' 
                        + clientID 
                        + '/client-secret';
                
                apiClient.makeRequest('POST', URI, {
                    user_password: userPassword
                }, function (err, client) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, client.client_secret);
                });
            }
        }, function (err, results) {
            var clientSecret = results && results.findClientSecret;

            if (err) {
                return next(err);
            }

            res.send({
                client_secret: clientSecret
            });
        });
    });
};