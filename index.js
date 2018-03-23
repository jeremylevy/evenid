var cluster = require('cluster');
var os = require('os');
var http = require('http');

var express = require('express');
var path = require('path');
var querystring = require('querystring');

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var session = require('express-session');

var csrf = require('csurf');
var validator = require('validator');
var I18n = require('i18n-2');

var flash = require('connect-flash');
var methodOverride = require('method-override');
var escapeHTML = require('escape-html');

var escapeJS = require('jsesc');
var device = require('express-device');
var Type = require('type-of-is');

var MongoStore = require('connect-mongo')(session);
var removeDiacritics = require('diacritics').remove;

var jsonVersion = require('./version.json');

var config = require('./config');

var errorMiddleware = require('./errors/middlewares');

var routes = require('./routes');

var checkIfUserIsLoggedIn = require('./routes/users/callbacks/isLoggedIn');

var login = require('./routes/users/middlewares/login');
var setClientsWantFieldFn = require('./routes/users/middlewares/setClientsWantFieldFn');

var appVersion = jsonVersion.version;

var app = null;
var server = null;

process.on('uncaughtException', function (err) {
    console.error(
        '[%s] Uncaught exception: %s',
        (new Date).toUTCString(),
        err.message
    );
    
    console.error(err.stack);
    
    process.exit(1);
});

config.EVENID_SESSIONS_CONFIGURATION.store = new MongoStore({
    url: config.EVENID_MONGODB.URI
});

app = express();

// AWS Elastic Load Balancing placed behind proxy
app.enable('trust proxy');

// Don't set `x-powered-by` header in responses
app.disable('x-powered-by');

// Templating
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// `basedir` option is required 
// in order to use `include` with absolute paths
// in jade templates
app.locals.basedir = app.get('views');

// Redirect http:// to https://
app.use(function (req, res, next) {
    if (['development', 'test'].indexOf(config.ENV) !== -1) {
        return next();
    }

    // ELB health check made through HTTP
    // MAKE SURE NO SESSION WILL BE CREATED ON EACH REQUEST!!!
    if (req.path === '/health') {
        return res.sendStatus(200);
    }

    if (req.get('x-forwarded-proto') !== 'https') {
        return res.redirect(301, 'https://' + req.get('host') + req.originalUrl);
    }
    
    next();
});

// Serve static files
app.use(express.static(
    config.EVENID_STATIC_CONFIGURATION.directory, 
    config.EVENID_STATIC_CONFIGURATION.options
));

I18n.expressBind(app, {
    // setup some locales 
    // other locales default to 
    // `config.EVENID_LOCALES.DEFAULT` silently
    locales: config.EVENID_LOCALES.ENABLED,
    defaultLocale: config.EVENID_LOCALES.DEFAULT,
    subdomain: true,
    // Disable `Locale (*) not found.` message during testing
    devMode: config.ENV === 'development'
});

// Parse application/x-www-form-urlencoded 
// request and populate req.body object
app.use(bodyParser.urlencoded({
    // Parse query string
    extended: true
}));

app.use(cookieParser(config.EVENID_COOKIES_SECRET));

// We overwrite `clearCookie` function in order to 
// enable passing the same cookie options (taken from config)
// than during creation without the need to overwrite max age value.
// We MUST pass cookie options in order to effectively remove cookie.
app.use(function (req, res, next) {
    // Must be called within response context
    var clearCookie = (res.clearCookie).bind(res);

    res.clearCookie = function (cookieName, cookieOpts) {
        var _cookieOpts = {};

        // Make a copy
        Object.keys(cookieOpts).forEach(function (k) {
            _cookieOpts[k] = cookieOpts[k];
        });

        // Make sure passed max age was set
        _cookieOpts.maxAge = 1;

        clearCookie(cookieName, _cookieOpts);
    };

    next();
});

// Set best locale when subdomain doesn't start with it
// NEEDS TO BE AFTER cookie parser
app.use(function (req, res, next) { 
    // `fr-fr.dev.evenid.com` 
    // or `fr-fr.evenid.com`
    // Always last subdomain
    var currentLocale = req.subdomains.reverse()[0];

    // User use a locale different than 
    // the one chosen by default
    var wantedLocale = req.signedCookies.i18n_locale;
    
    var firstAcceptedLocale = req.acceptsLanguages()[0].toLowerCase();

    // Subdomain start with enabled locale:
    // -> So user has chosen to use a locale
    //  different than the one chosen by default
    if (config.EVENID_LOCALES.ENABLED.indexOf(currentLocale) !== -1) {
        // Save the user locale choice in cookie 
        // for future requests without subdomain
        res.cookie(config.EVENID_I18N_LOCALE_COOKIE.name, 
                   currentLocale, 
                   config.EVENID_I18N_LOCALE_COOKIE);
        
        // Pass
        return next();
    }

    // Sets a locale to the specified string. 
    // If the locale is not enabled, the locale defaults to 
    // the one specified by the `defaultLocale` option.
    // See above.
    req.i18n.setLocale(wantedLocale || firstAcceptedLocale);

    next();
});

// Enable PUT and DELETE methods
// with POST requests having `_method` param
// Make sure to set this AFTER body parser,
// but BEFORE `csrf`: http://blog.nibblesec.org/2014/05/nodejs-connect-csrf-bypass-abusing.html
app.use(methodOverride(function (req, res) {
    var method = req.body._method;

    if (['PUT', 'DELETE'].indexOf(method) === -1) {
        return;
    }

    delete req.body._method;

    return method;
}));

// Detect mobile device
app.use(device.capture());

// Add `is_mobile`, `is_tablet`...
// to the response locals property
device.enableDeviceHelpers(app);

// Session (before CSRF 
// because it needs it!)
app.use(session(config.EVENID_SESSIONS_CONFIGURATION));

// Flash messages 
// Before CSRF, 
// to allow managing `invalid csrf token` error if
// csrf middleware call next(error)
app.use(flash());

// Prevent multiple flash with same key set in array
app.use(function (req, res, next) {
    // Must be called within request context 
    // in order to access session
    var flash = (req.flash).bind(req);

    req.flash = function (key, msg) {
        if (key && msg) {
            // Don't set during ajax request
            if (key !== 'update.user' 
                && req.xhr) {
                
                return;
            }

            // Remove old value
            flash(key);
        }

        return flash(key, msg);
    };

    next();
});

// When user try to access "logged-restricted"
// page we want to redirect it to this page after login
// but only if user log in immediately after.
app.use(function (req, res, next) {
    var currentPath = req.path;

    // Remove login next
    if (['/login', '/register'].indexOf(currentPath) === -1
        && req.session.login_next) {
        
        delete req.session.login_next;
    }

    next();
});

// CSRF
app.use(csrf());

// Give to views access to different variables
app.use(function (req, res, next) {
    var host = req.get('host');
    // subdomains from left to right
    var subdomains = req.subdomains.reverse();
    var languages = req.acceptsLanguages();
    var probableCountryForUser = '';

    if (languages.length) {
        probableCountryForUser = languages[0].split('-');
        // `en-us` -> `us`, `us` -> `us`
        probableCountryForUser = probableCountryForUser[probableCountryForUser.length - 1];
        probableCountryForUser = probableCountryForUser.toUpperCase();
    }

    // Most probable country for current user
    // according to the requested languages
    // Used to prefill country and place of birth fields
    // Don't use current locale because enabled locales may mismatch
    // wanted locale
    res.locals.probableCountryForUser = probableCountryForUser;

    // Used to display purpose
    // like for date of birth months/days order
    res.locals.currentLocale = req.i18n.getLocale();

    // Give access to csrf token in views
    res.locals.csrfToken = req.csrfToken();

    // Give access to config var in views
    res.locals.config = config;

    // Give access to session var in views
    res.locals.session = req.session;

    // User can be set `as logged` in next middlewares
    // so set it as a function here, not direct value
    res.locals.userIsLoggedIn = function () {
        return checkIfUserIsLoggedIn(req);
    };

    // Used in docs to link to app page
    res.locals.currentDomain = req.protocol + '://' + req.get('host');

    // Used in country selector on footer
    res.locals.host = host;

    if (['stage', 'dev'].indexOf(subdomains[0]) === -1) {
        res.locals.host = host.replace(new RegExp('^' + subdomains.join('\\.') + '\\.'), '');    
    }
    
    res.locals.subdomains = subdomains;

    res.locals.query = req.query;
    res.locals.path = req.path;
    // Differ from path by the querystring
    res.locals.currentURI = req.path;

    if (Object.keys(req.query).length > 0) {
        res.locals.currentURI += '?' + querystring.stringify(req.query);
    }

    // Helper
    res.locals.escapeHTML = escapeHTML;
    res.locals.escapeJS = escapeJS;

    // Default i18n messages
    // Attached to HTML body
    res.locals.i18n = JSON.stringify({
        'error': req.i18n.__('Error'),
        'unknownError': req.i18n.__('An unknown error has occurred. Please try again.')
    });
    res.locals.addI18nMessage = function (key, value) {
        res.locals.i18n[key] = req.i18n.__(value);
    };

    res.locals._flash = {};
    // We want to call flash method 
    // with same key multiple time
    // without being removed in between.
    res.locals.flash = function (key, prefix) {
        var flash = req.flash(key);

        if (key) {
            // Always return value in template
            // Easier to implement
            if (!flash || !flash.length) {
                flash = res.locals._flash[key];
            } else {
                // Use concat to make a copy
                res.locals._flash[key] = [].concat(flash);
            }
        } else { // We want all stored values
            if (prefix) {
                for (var _key in flash) {
                    if (_key.match(new RegExp('^' + prefix))) {
                        continue;
                    }

                    req.flash(_key, flash[_key]);

                    delete flash[_key];
                }
            } else {
                if (!flash || !flash.length) {
                    flash = res.locals._flash;
                } else {
                    res.locals._flash = flash;
                }
            }
        }

        // flash method returns an array
        // prefer string in templates
        return Type.is(flash, Array) && flash.length === 1 
            ? flash[0] 
            : flash;
    };

    // Used to compare user full name in oauth authorizations.
    // (If user name differs from address full name we need to display it)
    res.locals.removeDiacritics = removeDiacritics;

    // Used to display client statistics
    // http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
    res.locals.numberWithCommas = function (x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    res.locals.cloudfrontAssetsURL = function (key) {
        return config.EVENID_AWS
                     .CLOUDFRONT
                     .URLS
                     .ASSETS + '/' + key.replace(/^\/+/, '');
    };

    res.locals.staticURL = function (filePath) {
        var acceptEncoding = req.get('accept-encoding');
        var ext = path.extname(filePath);
        
        if (['development', 'test'].indexOf(config.ENV) !== -1) {
            return filePath;
        }

        if (['.css', '.js'].indexOf(ext) !== -1
            && acceptEncoding.match(/\bgzip\b/)) {

            filePath += '.gz';
        }

        return res.locals.cloudfrontAssetsURL('/' + appVersion + '/' + filePath.replace(/^\/+/, ''));
    };

    next();
});

// Add common headers
app.use(function (req, res, next) {
    var extname = path.extname(req.path);

    // Add cross-domain header for fonts, required by spec, Firefox, and IE.
    if (['.eot', '.ttf', '.otf', '.woff'].indexOf(extname) >= 0) {
        res.header('Access-Control-Allow-Origin', '*');
    }

    // Prevents IE and Chrome from MIME-sniffing a response. Reduces exposure to
    // drive-by download attacks on sites serving user uploaded content.
    res.header('X-Content-Type-Options', 'nosniff'),

    // Prevent rendering of site within a frame in order to avoid Clickjacking.
    // Use `SAMEORIGIN` here to allow upload in iframe
    res.header('X-Frame-Options', 'SAMEORIGIN');

    // Enable the XSS filter built into most recent web browsers. It's usually
    // enabled by default anyway, so role of this headers is to re-enable for this
    // particular website if it was disabled by the user.
    res.header('X-XSS-Protection', '1; mode=block');

    // Force IE to use latest rendering engine or Chrome Frame
    res.header('X-UA-Compatible', 'IE=Edge,chrome=1');

    next();
});

// Handle persistent login cookie
app.use(login.bind({
    name: 'handlePersistentLogin'
}));

// Update user in session when user was updated
app.use(function (req, res, next) {
    var updateUser = req.flash('update.user');

    if (updateUser[0] === 'YES') {
        return login.apply({
            name: 'updateUser'
        }, Array.prototype.slice.call(arguments));
    }

    next();
});

// We never want authorize 
// flow pages to be cached
app.all(new RegExp('^/oauth/authorize'), function (req, res, next) {
    res.header('Cache-Control', 'private, no-store, max-age=0, no-cache, must-revalidate, post-check=0, pre-check=0');
    
    res.header('Pragma', 'no-cache');

    res.header('Expires', 'Fri, 01 Jan 1990 00:00:00 GMT');

    next();
});

// Add function to res.locals
// that check if user field 
// was asked by a client 
app.all(new RegExp('^(/users/' 
                 + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                 + '|/oauth/authorize)'), 
        setClientsWantFieldFn);

// Clean unused flash messages
app.use(function (req, res, next) {
    // Must be called within response context 
    var render = (res.render).bind(res);

    res.render = function () {
        render.apply(this, Array.prototype.slice.call(arguments));

        req.flash();
    };

    next();
});

// Hack to fix a race condition
// that occurs when response is sent
// before session was saved. 
// (https://github.com/expressjs/session/pull/69)
// TODO: Find a clever way?
app.use(function (req, res, next) {
    // Must be called within response context 
    var redirect = (res.redirect).bind(res);

    res.redirect = function () {
        var args = Array.prototype.slice.call(arguments);

        req.session.save(function () {
            redirect.apply(this, args);
        });
    };

    next();
});

// Load the routes
routes(app, express);

// 404
app.use(function(req, res, next) {
    res.locals.is404Error = true;

    res.status(404).render('errors/404');
});

// Error middleware in last
app.use(errorMiddleware);

// if (cluster.isMaster 
//     && config.ENV !== 'test') {
    
//     for (var i = 0; i < os.cpus().length; ++i) {
//         cluster.fork();
//     }
    
//     cluster.on('exit', function (worker, code, signal) {
//         console.log(
//             'Worker %d died (%s). Restarting...',
//             worker.process.pid,
//             signal || code
//         );

//         cluster.fork();
//     });

//     return;
// }

// When required
module.exports = function (cb) {
    if (!server) {
        server = http.createServer(app);
    }

    server.listen(config.PORT, function () {
        cb(null, server);
    });
};

// Loaded from command line
if (require.main === module) {
    app.listen(config.PORT, function () {
        console.log('Listening on %d', config.PORT);
    });
}