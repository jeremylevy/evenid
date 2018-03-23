var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/redirection-uris/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')$');
    
    app.delete(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var clientID = req.params[0];
        var redirectionURIID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            deleteClientRedirectionURI: function (cb) {
                var URI = '/clients/' 
                        + clientID 
                        + '/redirection-uris/' 
                        + redirectionURIID;

                apiClient.makeRequest('DELETE', URI, 
                                      {}, function (err, redirectionURIID) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, redirectionURIID);
                });
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('The redirection URI has been successfully deleted.'));
            req.flash('notification.type', 'success');
            
            res.redirect('/clients/' + clientID + '/redirection-uris');
        });
    });
};