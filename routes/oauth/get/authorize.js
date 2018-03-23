var util = require('util');
var querystring = require('querystring');
var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var isLoggedIn = require('../../users/callbacks/isLoggedIn');
var handleRedirectToOppositeFlow = require('../callbacks/handleRedirectToOppositeFlow');

module.exports = function (app, express) {
    app.get('/oauth/authorize', function (req, res, next) {
        var query = req.query;
        var stringifiedQS = querystring.stringify(query);
        var flow = validator.trim(req.query.flow);
        
        var userIsLoggedIn = isLoggedIn(req);

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   userIsLoggedIn && req.session.login.access_token,
                                   userIsLoggedIn && req.session.login.refresh_token);

        if (flow === 'recover_password') {
            return next('route');
        }

        async.auto({
            getAccessToken: function (cb) {
                if (userIsLoggedIn) {
                    return cb(null);
                }

                apiClient.makeRequest('POST', '/oauth/token', {
                    grant_type: 'client_credentials'
                }, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    apiClient = _apiClient(req, res,
                                           config.EVENID_APP.CLIENT_ID, 
                                           config.EVENID_APP.CLIENT_SECRET, 
                                           config.EVENID_API.ENDPOINT,
                                           resp.access_token,
                                           resp.refresh_token);


                    cb(null, resp);
                });
            },

            getRequestData: ['getAccessToken', function (cb) {
                apiClient.makeRequest('GET', '/oauth/authorize?' + stringifiedQS, 
                                      {}, function (err, requestData) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, requestData);
                });
            }],

            findAuthorizations: ['getAccessToken', function (cb) {
                var user = null;

                if (!userIsLoggedIn) {
                    return cb(null);
                }

                user = req.session.login.user;

                apiClient.makeRequest('GET', '/users/' + user.id + '/authorizations',
                                      {}, function (err, authorizations) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, authorizations);
                });
            }]
        }, function (err, results) {
            var requestData = results && results.getRequestData;
            var authorizations = results && results.findAuthorizations;

            var testAccount = req.signedCookies[util.format(config.EVENID_TEST_ACCOUNT_COOKIE.name, 
                                                            requestData 
                                                            && requestData.client 
                                                            && requestData.client.id)];

            if (err) {
                return next(err);
            }

            // Try to use the same user ID on each test
            // and future registration
            if (testAccount) {
                res.locals.testAccount = testAccount;
            }

            if (['credentials', 'choose_account'].indexOf(requestData.step) !== -1) {
                if (requestData.step === 'credentials') {
                    // Recover password link is same link with different flow
                    query.flow = 'recover_password';

                    // Make sur code was not keeped from previous requests
                    delete query.code;

                    res.locals.recoverPasswordLink = req.path + '?' + querystring.stringify(query);

                    // Back to real value
                    query.flow = flow;
                }

                res.render('oauth/authorize/login', requestData);

                return;

            } else if (requestData.step === 'authorizations') {
                if (requestData.user.date_of_birth) {
                    requestData.user.date_of_birth = new Date(requestData.user.date_of_birth);
                }

                requestData.authorizations = authorizations;
                
                res.render('oauth/authorize/authorizations', requestData);

                return;

            } else if(['redirect_to_login_flow', 
                       'redirect_to_registration_flow'].indexOf(requestData.step) !== -1) { 
                
                // Registered user try to register once again
                // Unregistered user try to login
                handleRedirectToOppositeFlow(requestData.clientName, req, res);

                return;
            }
        });
    });
};