var querystring = require('querystring');
var async = require('async');

var mongoose = require('mongoose');

var config = require('../../config');

var getUnloggedRequest = require('../getUnloggedRequest');

var updateOauthClient = require('../clients/update');
var updateOauthClientRedirectionURI = require('../clients/updateRedirectionURI');

module.exports = function (beforeHookResp, testAccount, cb) {
    var unloggedRequest = null;
    var request = beforeHookResp.request;
    var unloggedCsrfToken = null;
    var csrfToken = beforeHookResp.csrfToken;
    var client = beforeHookResp.client;
    var redirectionURI = beforeHookResp.redirectionURI;

    async.auto({
        // Make sure oauth client allow test accounts
        updateOauthClient: function (cb) {
            updateOauthClient(csrfToken, client.id, {
                authorize_test_accounts: 'true'
            }, request, function (err, updatedClient) {
                
                if (err) {
                    return cb(err);
                }

                cb(null, updatedClient);
            });
        },

        updateOauthClientRedirectionURI: function (cb) {
            updateOauthClientRedirectionURI(csrfToken, client.id, redirectionURI.id, {
                authorizations: ['emails'],
                authorization_flags: {}
            }, request, function (err, updatedRedirectionURI) {
                
                if (err) {
                    return cb(err);
                }

                redirectionURI = updatedRedirectionURI;

                cb(null, updatedRedirectionURI);
            });
        },

        // To convert a test account 
        // we must use testing
        // during unlogged request 
        // otherwise logged user id
        // will be used
        getUnloggedRequest: function (cb) {
            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                unloggedRequest = resp.request;
                unloggedCsrfToken = resp.csrfToken;

                cb(null, resp);
            });
        },

        // Use test account second time or more
        useTestAccount: ['updateOauthClient', 
                         'updateOauthClientRedirectionURI',
                         'getUnloggedRequest', function (cb, results) {
            
            var query = null;

            query = {
                client_id: client.client_id.toString(),
                redirect_uri: redirectionURI.redirect_uri,
                state: 'foo',
                flow: 'registration'
            };

            unloggedRequest
                .post('/oauth/authorize?' + querystring.stringify(query))
                // Body parser middleware need it in order to populate req.body
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send({
                    email: mongoose.Types.ObjectId().toString() + '@evenid.com',
                    password: mongoose.Types.ObjectId().toString(),
                    test_account: testAccount,
                    _csrf: unloggedCsrfToken
                })
                .end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }
                    
                    cb(null, resp);
                });
        }]
    }, function (err, results) {
        var resp = results && results.useTestAccount;

        if (err) {
            return cb(err);
        }

        cb(null, resp);
    });
};