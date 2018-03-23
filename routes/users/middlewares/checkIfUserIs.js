var querystring = require('querystring');

var isLoggedIn = require('../callbacks/isLoggedIn');
var getOauthFlowForUserDependingOnAuth = require('../callbacks/getOauthFlowForUserDependingOnAuth');

module.exports = function (is) {
    if (['logged', 'unlogged'].indexOf(is) === -1) {
        throw new Error('`is` param must be set to `logged` or `unlogged`');
    }

    return function (req, res, next) {
        var currentQuery = req.query;
        var currentPath = req.path;
        
        var userIsLoggedIn = isLoggedIn(req);
        var user = null;

        // If asked state match user state
        // pass to next middleware
        if ((is === 'logged' 
             && userIsLoggedIn)
            || (is === 'unlogged' 
                && !userIsLoggedIn)) {

            return next();
        }

        // For ajax requests
        if (req.xhr) {
            return res.status(403).send({
                type: 'access_denied',
                messages: {
                    main: 'You are not authorized to access this resource.'
                }
            });
        }

        req.flash('notification.type', 'error');

        // Wants unlogged but user is logged
        if (is === 'unlogged') {
            user = req.session.login.user;
            
            req.flash('notification', req.i18n.__('You must log out to see this page.'));

            // During oauth auth recover password flow
            if (currentPath === '/oauth/authorize'
                && currentQuery.flow === 'recover_password') {

                // Redirect to registration flow by default,
                // and to login if user has authorized client
                currentQuery.flow = getOauthFlowForUserDependingOnAuth(user, currentQuery.client_id);

                // If redirect appears when user click on email link
                if (currentQuery.code) {
                    // Don't redirect with code
                    delete currentQuery.code;
                }

                res.redirect(currentPath + '?' + querystring.stringify(currentQuery));

                // We don't need to repopulate current query 
                // with original values given that we redirect user

                return;
            }
            
            // Redirect to user profil
            return res.redirect('/users/' + req.session.login.user.id);
        }

        // Keep query string
        if (Object.keys(currentQuery).length) {
            currentPath += '?' + querystring.stringify(currentQuery);
        }

        req.flash('notification', req.i18n.__('You must log in to see this page.'));

        req.session.login_next = currentPath;

        res.redirect('/login');
    };
};