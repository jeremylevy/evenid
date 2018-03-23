var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/redirection-uris/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            +')$');
    
    app.put(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var redirectURI = validator.trim(req.body.redirect_uri);
        var scope = Array.isArray(req.body.authorizations) 
                        ? req.body.authorizations.join(' ') 
                        : '';

        var scopeFlags = req.body.authorization_flags;
        var scopeFlagsPN = [];
        var scopeFlagsAddresses = [];
        
        var responseType = validator.trim(req.body.response_type);

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        var clientID = req.params[0];
        var redirectionURIID = req.params[1];

        if (scopeFlags 
            && scopeFlags.phone_numbers
            // Make sure phone number was checked
            // alongs mobile or landline type
            && scope.indexOf('phone_numbers') !== -1) {
            
            // If only mobile or landline was checked
            // we have a string otherwise an array
            scopeFlagsPN = Array.isArray(scopeFlags.phone_numbers) 
                ? scopeFlags.phone_numbers 
                : [scopeFlags.phone_numbers];
        }

        if (scopeFlags 
            && scopeFlags.addresses
            // Make sure address was checked
            // alongs `Separate shipping and billing address`
            && scope.indexOf('addresses') !== -1) {
            
            scopeFlagsAddresses = [scopeFlags.addresses];
        }
        
        async.auto({
            updateClientRedirectionURI: function (cb) {
                apiClient.makeRequest('PUT', '/clients/' + clientID + '/redirection-uris/' + redirectionURIID, {
                    uri: redirectURI,
                    scope: scope,
                    scope_flags: scopeFlagsPN.concat(scopeFlagsAddresses).join(' '),
                    response_type: responseType
                }, function (err, redirectionURI) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, redirectionURI);
                });
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('The redirection URI has been successfully updated.'));
            req.flash('notification.type', 'success');
            
            res.redirect(req.path);
        });
    });
};