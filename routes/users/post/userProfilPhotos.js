var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/profil-photos$');

    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var profilPhotoURL = validator.trim(req.body.url);

        var userID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            updateUser: function (cb) {
                apiClient.makeRequest('PUT', '/users/' + userID, {
                    profil_photo: profilPhotoURL
                }, function (err, user) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, user);
                });
            }
        }, function (err, results) {
            var user = results && results.updateUser;

            if (err) {
                return next(err);
            }

            req.flash('update.user', 'YES');

            res.send(user);
        });
    });
};