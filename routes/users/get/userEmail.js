var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/emails/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];
        var user = req.session.login.user;

        var emailID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);
        async.auto({
            findEmail: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/emails/' + emailID, 
                                      {}, function (err, email) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, email);
                });
            },

            findAuthorizations: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/authorizations'
                                      + '?entity=emails&entity_id=' + emailID, 
                                      {}, function (err, authorizations) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, authorizations);
                });
            }
        }, function (err, results) {
            var email = results && results.findEmail;
            var authorizations = results && results.findAuthorizations;

            if (err) {
                return next(err);
            }

            res.render('users/emails', {
                user: user,
                authorizations: authorizations,
                emails: [email],
                email: email
            });
        });
    });
};