var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/emails/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')/validate$');

    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];
        var emailID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);
        async.auto({
            validateEmail: function (cb) {
                apiClient.makeRequest('POST', '/users/' + userID 
                                            + '/emails/' + emailID + '/validate', 
                                      {}, function (err, resp) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }
        }, function (err, results) {
            var validateEmailResp = results && results.validateEmail;
            var redirectTo = '/users/' + userID + '/emails';

            if (err) {
                return next(err);
            }

            if (config.ENV === 'test') {
                redirectTo += '?code=' + validateEmailResp.code;
            }

            req.flash('notification.type', 'success');
            req.flash('notification', req.i18n.__('An email containing a link to validate '
                                                + 'your email address has just been sent to the address you provided.'));


            res.redirect(redirectTo);
        });
    });
};