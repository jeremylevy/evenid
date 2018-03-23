var querystring = require('querystring');
var Type = require('type-of-is');

var config = require('../../config');

var ApiError = require('../types/ApiError');

var logout = require('../../routes/users/middlewares/logout');

var isLoggedIn = require('../../routes/users/callbacks/isLoggedIn');

module.exports = function (err, req, res, next) {
    var reqQuery = req.query;
    var reqPathHasQuery = Object.keys(reqQuery).length > 0;
    var reqPath = req.path 
                + (reqPathHasQuery
                   ? '?' + querystring.stringify(reqQuery) 
                   : '');

    var isApiError = err instanceof ApiError;
    var isOauthAuthorizeError = reqPath.indexOf('/oauth/authorize') === 0;
    // Routes which have no GET method like /logout
    var isBlacklistedRedirectPath = reqPath.match(config.EVENID_ERRORS.REDIRECT_BLACKLIST.join('|'));
    
    // Get routes which needs redirect like /recover-password/:code -> /recover-password
    var isConfiguredGETRedirectPath = reqPath.match(Object.keys(config.EVENID_ERRORS.REDIRECT_GET).join('|'));
    var isConfiguredPOSTRedirectPath = reqPath.match(Object.keys(config.EVENID_ERRORS.REDIRECT_POST).join('|'));
    var getConfiguredRedirectPath = function (redirects, path) {
        var redirectPath = undefined;
        var matches = [];

        Object.keys(redirects || {}).forEach(function (redirect) {
            var matches = path.match(redirect);

            if (!matches) {
                return;
            }

            // Make a copy to avoid modifications in config object
            redirectPath = JSON.parse(JSON.stringify(redirects[redirect]));

            // GET method contains capturing parenthesis
            // materialized by `$[0-9]+` in redirect path
            if (matches.length > 1) {
                for (var i = 1, j = matches.length; i < j; ++i) {
                    redirectPath.path = redirectPath.path.replace('$' + i, matches[i]);
                }
            }
        });

        return redirectPath;
    };
    var configuredRedirectPath = null;
    
    var notification = {
        type: 'error',
        statusCode: 500,
        message: req.i18n.__('An unknown error has occurred. Please try again.')
    };
    var redirectTo = null;
    
    var conserveReqBody = function (prefix, req) {
        var setFlash = function (param, value) {
            // Keep ref to all fields to prefill form
            // Make sure to pass not empty string in case field is empty
            // flash takes empty string as undefined...
            req.flash(param, value);
        };

        prefix = prefix || '';

        for (var param in req.body) {
            // In case array was passed in form
            // (ie: multiple params with the same key)
            // Set param value as key to avoid overwrite
            // flash value
            if (Type.is(req.body[param], Array)) {
                for (var i = 0, j = req.body[param].length; i < j; ++i) {
                    // Array [] -> [value]
                    setFlash(prefix + param + '[' + req.body[param][i] + ']', req.body[param][i]);
                }

                continue;
            }

            // Associative array, same than before
            if (Type.is(req.body[param], Object)) {
                for (var key in req.body[param]) {
                    
                    // Associative array[key] contains an array
                    // Set each value, see before
                    if (Type.is(req.body[param][key], Array)) {
                        for (var i = 0, j = req.body[param][key].length; i < j; ++i) {
                            setFlash(prefix + param + '[' + key + '][' + req.body[param][key][i] + ']', req.body[param][key][i]);
                        }

                        continue;
                    }

                    // Associative array [key] -> [key][value]
                    setFlash(prefix + param + '[' + key + '][' + req.body[param][key] + ']', req.body[param][key]);
                }

                continue;
            }

            // Simple value
            setFlash(prefix + param, req.body[param]);
        }
    };

    if (['stage', 'development'].indexOf(config.ENV) !== -1
        || (config.ENV === 'test' 
            && !isApiError 
            && (req.path !== '/logout' 
                || req.body._csrf !== 'TEST_INVALID_VALUE'))) {
        
        console.error('ERROR IN APP -> ', err, err.stack);
    }

    if (isApiError) {
        // Default, maybe overwritten
        notification.statusCode = 400;

        // When form or query string has invalid parameters
        if (err.kind === 'invalid_request'
            // During oauth authorize, error in query string are sent directly in response
            && (!isOauthAuthorizeError || req.method !== 'GET')) {
            
            // Don't set flash if blacklisted
            if (!isBlacklistedRedirectPath) {
                // Set invalid fields as error in session
                for (var wrongField in err.messages) {
                    // Used to display error under input field
                    req.flash('errors.' + wrongField, err.messages[wrongField]);
                }

                // To prefill ALL fields
                conserveReqBody(null, req);
            }

            notification.message = req.i18n.__('This form contains invalid fields.');
        
        // When user try to login with invalid credentials
        } else if (err.kind === 'invalid_grant') {
            if (err.messages.invalid_email) {
                notification.message = req.body.email 
                    ? req.i18n.__('This email address does not exist.')
                    : req.i18n.__('Your email address must be set.');
            } else if (err.messages.invalid_password) {
                notification.message = req.body.password 
                    ? req.i18n.__('Your password is invalid.') 
                    : req.i18n.__('Your password must be set.');
            } else {
                notification.message = req.i18n.__('Invalid credentials.');
            }

            // Don't set flash if blacklisted
            if (!isBlacklistedRedirectPath) {
                // Prefill email...
                if (req.body.email) {
                    req.flash('email', req.body.email);
                }

                // Red input without error message
                // (EMPTY STRING EQUALS FALSE SO SET A SPACE)
                if (err.messages.invalid_email) {
                    req.flash('errors.email', ' ');
                }

                // ...and password field
                if (req.body.password) {
                    req.flash('password', req.body.password);  
                }

                // Red input without error message
                // (EMPTY STRING EQUALS FALSE SO SET A SPACE)
                if (err.messages.invalid_password) {
                    req.flash('errors.password', ' ');
                }

                if (err.messages.invalid_password 
                    && req.path === '/oauth/authorize' 
                    && req.query.flow === 'registration') {
                    
                    // Display "The password previously used on 
                    // sites and applications using EvenID"
                    req.flash('invalid_password', 'true');
                }

                if (!err.messages.invalid_email) {
                    // Prefill recover password form email field
                    req.session.recoverPassword = {
                        email: req.body.email
                    };
                }
            }
        // Too many attempts error (to prevent brute-force attacks)
        // Too many attempts captcha error
        } else if (['max_attempts_reached', 
                    'max_attempts_captcha_error'].indexOf(err.kind) !== -1) { 
            
            // Don't set flash if blacklisted
            if (!isBlacklistedRedirectPath) {
                // Conserve sent form when displaying captcha
                conserveReqBody('request.body.', req);

                req.flash('maxAttemptsError', 'true');
                req.flash('recaptchaPublicKey', config.EVENID_RECAPTCHA.PUBLIC_KEY);
            }

            if (err.kind === 'max_attempts_captcha_error') {
                notification.message = req.i18n.__('The numbers (or words) entered are invalid.');
            }
        // Invalid access or refresh token
        } else if (err.kind === 'invalid_token' 
                   && isLoggedIn(req)) {

            // Display unknown error has arisen
            req.flash('notification', notification.message);
            req.flash('notification.type', notification.type);

            // and logout
            return logout(req, res, next);
        } else if (err.messages.main) {
            if (err.kind === 'access_denied') {
                notification.statusCode = 403;
            } else if (err.kind === 'not_found') {
                notification.statusCode = 404;
            }
            
            notification.message = err.messages.main;
        }
    }

    // If error arise when user send form
    // redirect him to it
    if ((req.method !== 'GET' && !isBlacklistedRedirectPath
        // GET methods with configured redirection
        || req.method === 'GET' && isConfiguredGETRedirectPath)
        && !req.xhr) {

        redirectTo = reqPath;

        // GET methods with configured redirection
        if (req.method === 'GET' && isConfiguredGETRedirectPath
            || req.method === 'POST' && isConfiguredPOSTRedirectPath) {
            
            // Use a function to access config value because 
            // GET/POST redirects keys are defined as RegExp
            // configuredRedirectPath = {path: 'pathToRedirectTo', qsParametersToDelete: []}
            configuredRedirectPath = getConfiguredRedirectPath(config.EVENID_ERRORS['REDIRECT_' + req.method], reqPath);

            redirectTo = configuredRedirectPath.path;

            // Append querystring if any
            if (reqPathHasQuery) {
                // Remove querystring parameter 
                // defined by configured redirection
                if (configuredRedirectPath.qsParametersToDelete) {
                    configuredRedirectPath.qsParametersToDelete.forEach(function (param) {
                        delete reqQuery[param];
                    });
                }

                redirectTo += '?' + querystring.stringify(reqQuery);
            }
        }

        if (err.kind !== 'max_attempts_reached') {
            req.flash('notification', notification.message);
            req.flash('notification.type', notification.type);
        }
        
        return res.redirect(redirectTo);
    }

    res.status(notification.statusCode);

    // Error during ajax requests,
    // send err object as JSON.
    if (req.xhr) {
        if (isApiError) {
            return res.send({
                type: err.kind,
                messages: err.messages
            });
        }

        return res.send({
            type: 'server_error',
            messages: {
                main: notification.message
            }
        });
    }

    if ((isOauthAuthorizeError 
         && isApiError)
        || config.ENV === 'development') {
        
        return res.send('<pre>' 
                        + isApiError 
                            ? JSON.stringify({error: {type: err.kind, messages: err.messages}}, null, 2)
                            : JSON.stringify({error: err}, null, 2)
                        + '</pre>');
    }

    res.send(notification.message);
};