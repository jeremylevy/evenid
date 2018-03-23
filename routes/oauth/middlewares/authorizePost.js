var util = require('util');

var url = require('url');
var querystring = require('querystring');

var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var setUserAsLogged = require('../../users/callbacks/setUserAsLogged');
var setUserInSession = require('../../users/callbacks/setUserInSession');

var isLoggedIn = require('../../users/callbacks/isLoggedIn');
var handleRedirectToOppositeFlow = require('../callbacks/handleRedirectToOppositeFlow');

module.exports = function (req, res, next) {
    var context = this;

    var flow = validator.trim(req.query.flow);
    var userIsLoggedIn = isLoggedIn(req);

    var apiClient = _apiClient(req, res,
                               config.EVENID_APP.CLIENT_ID, 
                               config.EVENID_APP.CLIENT_SECRET, 
                               config.EVENID_API.ENDPOINT,
                               userIsLoggedIn && req.session.login.access_token,
                               userIsLoggedIn && req.session.login.refresh_token);

    var invalidRequestError = null;
    var stringifiedQS = querystring.stringify(req.query);

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
            apiClient.makeRequest('POST', 
                                  '/oauth/authorize?' + stringifiedQS, 
                                  req.body, function (err, resp) {
                if (err) {
                    // User has passed invalid fields
                    // Give a chance to `findUser` callback to execute,
                    // in order to update user in session.
                    // Indeed, user fields could have been updated during request
                    // even if request contained invalid fields (authorizations)
                    if (err.kind === 'invalid_request') {
                        invalidRequestError = err;

                        return cb(null);
                    }

                    return cb(err);
                }

                cb(null, resp);
            });
        }],

        findUser: ['getRequestData', function (cb, results) {
            var requestData = results.getRequestData;
            // Only given during successfull login/register to set
            // user in session
            var userID = requestData 
                            && requestData.accessToken 
                            && requestData.accessToken.user_id;

            if (requestData && requestData.useTestAccount) {
                return cb(null);
            }

            // Unsuccessfull login/register?
            // Unsuccessfull authorizations?
            // Successfull authorizations?
            if (!userID) {
                // Unsuccessfull authorizations?
                // Successfull authorizations?
                if (userIsLoggedIn) { 
                    userID = req.session.login.user.id;
                } else { // Unsuccessfull login
                    return cb(null);
                }
            }

            apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,

                                   requestData && requestData.accessToken
                                    ? requestData.accessToken.access_token 
                                    : req.session.login.access_token,
                                    
                                   requestData && requestData.accessToken
                                    ? requestData.accessToken.refresh_token 
                                    : req.session.login.refresh_token);

            apiClient.makeRequest('GET', '/users/' + userID, {}, function (err, resp) {
                if (err) {
                    return cb(err);
                }

                cb(null, resp.user);
            });
        }]
    }, function (err, results) {
        var requestData = results && results.getRequestData;
        var user = results && results.findUser;

        // User fields could have been updated 
        // during authorizations request
        // even with `invalidRequestError`,
        // so update value in session.
        if (userIsLoggedIn && user) {
            setUserInSession(req, user);
        }

        if (invalidRequestError || err) {
            return next(invalidRequestError || err);
        }

        // If user was successfully logged
        if (requestData.accessToken) {
            setUserAsLogged(req, res, requestData.accessToken, 
                            user, !!req.body.persistent_login);
        }
        
        if (requestData.useTestAccount
            && !userIsLoggedIn) {

            // Set user id in cookie in order to
            // re-use the same user on each test
            // and link user with future registration
            res.cookie(util.format(config.EVENID_TEST_ACCOUNT_COOKIE.name, 
                                   requestData.clientID), 
                       requestData.userID, 
                       config.EVENID_TEST_ACCOUNT_COOKIE);
        }

        // Registered user try to register once again
        if (['redirect_to_login_flow',
             // Unregistered user try to login 
             'redirect_to_registration_flow'].indexOf(requestData.step) !== -1) {
            
            handleRedirectToOppositeFlow(requestData.clientName, req, res);

            return;
        }

        if (requestData.deleteTestAccountCookie) {
            res.clearCookie(util.format(config.EVENID_TEST_ACCOUNT_COOKIE.name, 
                                        requestData.clientID),
                            config.EVENID_TEST_ACCOUNT_COOKIE);
        }

        if (context.successCallback) {
            context.successCallback();
            
            return;
        }

        // Client is a desktop app
        if (!!requestData.redirectTo
                         .match(/^urn:ietf:wg:oauth:2\.0:oob(:auto)?\?.+$/)) {

            req.session.redirectToOauthDesktopAppData = requestData;

            // Append code and state
            res.redirect('/oauth/authorize/desktop-app?' 
                         + url.parse(requestData.redirectTo).query);

            return;
        }

        res.redirect(requestData.redirectTo === 'same' 
                     ? req.path + '?' + stringifiedQS 
                     : requestData.redirectTo);
    });
};