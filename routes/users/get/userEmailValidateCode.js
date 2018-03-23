var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/emails/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')/validate/('
                            + config.EVENID_USER_VALIDATE_EMAIL_REQUESTS
                                    .CODE
                                    .PATTERN 
                            +')$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];
        var emailID = req.params[1];
        var code = req.params[2];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);
        async.auto({
            validateEmail: function (cb) {
                apiClient.makeRequest('POST', '/users/' + userID 
                                            + '/emails/' + emailID 
                                            + '/validate/' + code, 
                                      {}, function (err, resp) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('notification.type', 'success');
            req.flash('notification', req.i18n.__('Your email has been successfully validated.'));

            res.redirect('/users/' + userID + '/emails');
        });
    });
};