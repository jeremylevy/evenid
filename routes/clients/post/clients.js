var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

var _apiClient = require('../../../libs/apiClient');

module.exports = function (app, express) {
    app.post('/clients', checkIfUserIs('logged'), function (req, res, next) {
        var clientName = validator.trim(req.body.client_name);
        var clientDescription = validator.trim(req.body.client_description);
        var clientWebsite = validator.trim(req.body.client_website);
        var clientLogo = validator.trim(req.body.file_url);

        // `authorize_test_accounts` is an array when checked
        // and equals to `false` otherwise.
        // It's easier to check for equality with `false`
        // than to check an array.
        var authorizeTestAccounts = req.body.authorize_test_accounts === 'false' 
                                        ? 'false' 
                                        : 'true';

        var facebookUsername = validator.trim(req.body.client_facebook_username);
        var twitterUsername = validator.trim(req.body.client_twitter_username);
        var instagramUsername = validator.trim(req.body.client_instagram_username);

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            createClient: function (cb) {
                apiClient.makeRequest('POST', '/clients', {
                    name: clientName,
                    description: clientDescription,
                    website: clientWebsite,
                    logo: clientLogo,

                    authorize_test_accounts: authorizeTestAccounts,
                    
                    facebook_username: facebookUsername,
                    twitter_username: twitterUsername,
                    instagram_username: instagramUsername
                }, function (err, client) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, client);
                });
            }
        }, function (err, results) {
            var client = results && results.createClient;

            if (err) {
                return next(err);
            }

            // Update because user can becomes developer by creating a client
            // and client was attached to user.
            // If user becomes developer by creating a client, scope of the current access token 
            // has been updated during POST request in API
            req.flash('update.user', 'YES');

            req.flash('notification', req.i18n.__('The client has been successfully created.'));
            req.flash('notification.type', 'success');

            res.redirect('/clients/' + client.id);
        })
    });
};