var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/redirection-uris$');
    
    app.post(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var clientID = req.params[0];
        var redirectURI = validator.trim(req.body.redirect_uri);

        // Check that we don't have an empty scope
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

            // User doesn't want to distinguish between landline and mobile
            if (scopeFlagsPN.indexOf('doesnt_matter') !== -1) {
                scopeFlagsPN = [];
            }
        }

        if (scopeFlags 
            && scopeFlags.addresses
            // Make sure address was checked
            // alongs `Separate shipping and billing address`
            && scope.indexOf('addresses') !== -1) {
            
            scopeFlagsAddresses = [scopeFlags.addresses];
        }

        async.auto({
            createClientRedirectionURI: function (cb) {
                var URI = '/clients/' 
                        + clientID 
                        + '/redirection-uris';
                
                apiClient.makeRequest('POST', URI, {
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
            var createdRedirectionURI = results && results.createClientRedirectionURI;
            
            if (err) {
                return next(err);
            }

            req.flash('notification', req.i18n.__('The redirection URI has been successfully created.'));
            req.flash('notification.type', 'success');
            
            if (config.ENV === 'test') {
                return res.redirect(req.path + '/' + createdRedirectionURI.id);
            }
            
            res.redirect(req.path + '/page/last');
        });
    });
};