var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/emails/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')$');
    
    app.delete(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];
        var emailID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            deleteUserEmail: function (cb) {
                apiClient.makeRequest('DELETE', '/users/' + userID + '/emails/' + emailID, 
                                      {}, function (err) {
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

            req.flash('notification', req.i18n.__('The email has been successfully deleted.'));
            req.flash('notification.type', 'success');
            
            res.redirect('/users/' + userID + '/emails');
        });
    });
};