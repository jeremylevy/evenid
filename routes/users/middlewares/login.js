var validator = require('validator');
var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var isLoggedIn = require('../callbacks/isLoggedIn');
var setUserAsLogged = require('../callbacks/setUserAsLogged');

var setUserInSession = require('../callbacks/setUserInSession');
var clearPersistentLoginCookie = require('../callbacks/clearPersistentLoginCookie');

module.exports = function (req, res, next) {
    var context = this;
    // On index (before all middlewares).
    // To log user who pass persistent login cookie
    var usedToHandlePersistentLogin = context && context.name === 'handlePersistentLogin';

    // On index (before all middlewares).
    // Used when `updateUser` was set as flash before redirecting,
    // after user was updated in DB but needs to be updated in session with the same user
    // than those passed during login
    var usedToUpdateUser = context && context.name === 'updateUser';

    var email = validator.trim(req.body.email);
    var password = validator.trim(req.body.password);

    var recaptchaResponse = validator.trim(req.body['g-recaptcha-response']);

    // Set persistent login cookie the first time user send form.
    // Or, update persistent login cookie with new generated refresh token
    // when the old one was used.
    var persistentLogin = !!req.body.persistent_login || usedToHandlePersistentLogin;
    var refreshToken = req.signedCookies.persistent_login;
    
    var apiClient = _apiClient(req, res,
                               config.EVENID_APP.CLIENT_ID, 
                               config.EVENID_APP.CLIENT_SECRET, 
                               config.EVENID_API.ENDPOINT);

    var getAccessTokenReqParams = {
        grant_type: 'password',
        username: email,
        password: password,
        // Fuck, we break the RFC...
        // TODO: Find a clever way to pass recaptcha variable
        'g-recaptcha-response': recaptchaResponse
    };

    if (usedToHandlePersistentLogin 
        && (!refreshToken
            || isLoggedIn(req))) {

        return next();
    }

    if (usedToHandlePersistentLogin) {
        getAccessTokenReqParams = {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        };
    }

    async.auto({
        getAccessToken: function (cb) {
            // We just need to update user by retrieving
            // the same user than during login
            if (usedToUpdateUser) {
                return cb(null, req.session.login);
            }

            apiClient.makeRequest('POST', 
                                  '/oauth/token', 
                                  getAccessTokenReqParams, function (err, accessToken) {
                if (err) {
                    return cb(err);
                }
                
                cb(null, accessToken);
            });
        },

        getUser: ['getAccessToken', function (cb, results) {
            var accessToken = results.getAccessToken;

            apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   accessToken.access_token,
                                   accessToken.refresh_token);

            apiClient.makeRequest('GET', 
                                  '/users/' + accessToken.user_id, 
                                  {}, 
                                  function (err, resp) {
                if (err) {
                    return cb(err);
                }
                
                cb(null, resp.user);
            });
        }]
    }, function (err, results) {
        var nextURL = req.session.login_next;

        var accessToken = results && results.getAccessToken;
        var user = results && results.getUser;

        if (err) {
            if (usedToHandlePersistentLogin) {
                // If we don't remove 
                // persistent login cookie, user may 
                // be stuck to error page until cookie was removed.
                clearPersistentLoginCookie(res);

                // Pass. The user will not be set as logged.    
                return next();

                // User has sent cookie containing 
                // an invalid refresh token.
                // Maybe a hack?
                //if (err.kind === 'invalid_grant') {
                    // TODO: Inform the user of the potential hack.
                //}
            }

            // User will not be updated in session
            // Doesn't matter
            if (usedToUpdateUser) {
                return next();
            }

            return next(err);
        }

        if (!usedToUpdateUser) {
            setUserAsLogged(req, res, accessToken, user, persistentLogin);
        } else {
            setUserInSession(req, user);
        }

        if (usedToHandlePersistentLogin || usedToUpdateUser) {
            return next();
        }

        // When user fails to login
        // we save the email to prefill recover password
        // email field, remove it on success
        if (req.session.recoverPassword) {
            delete req.session.recoverPassword;
        }

        if (context && context.successCallback) {
            return context.successCallback();
        }

        res.redirect(nextURL || '/users/' + user.id);
    });
};