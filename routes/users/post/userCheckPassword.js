var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/check-password$');
    
    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userPassword = validator.trim(req.body.user_password);

        var userID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            checkUserPassword: function (cb) {
                apiClient.makeRequest('POST', '/users/' + userID + '/check-password', {
                    user_password: userPassword
                }, function (err) {
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

            res.send({});
        });
    });
};