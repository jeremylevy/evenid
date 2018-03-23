var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

var _apiClient = require('../../../libs/apiClient');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')$');

    app.delete(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userPassword = validator.trim(req.body.user_password);
        
        var clientID = req.params[0];

        var apiClient = _apiClient(req, res,
                                    config.EVENID_APP.CLIENT_ID, 
                                    config.EVENID_APP.CLIENT_SECRET, 
                                    config.EVENID_API.ENDPOINT,
                                    req.session.login.access_token,
                                    req.session.login.refresh_token);

        async.auto({
            deleteClient: function (cb) {
                apiClient.makeRequest('DELETE', '/clients/' + clientID, 
                                      {user_password: userPassword}, 
                                      function (err) {
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

            req.flash('update.user', 'YES');

            req.flash('notification', req.i18n.__('The client has been successfully deleted.'));
            req.flash('notification.type', 'success');

            res.redirect('/clients');
        });
    });
};