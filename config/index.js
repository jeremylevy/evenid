var path = require('path');
var validator = require('validator');

var mongoDBObjectIDPattern = '[0-9a-fA-F]{24}';

var clientSecretPattern = '[a-f0-9]{40}';
var oauthTokenPattern = '[a-f0-9]{40}';

var resetPasswordRequestsCodePattern = '[a-f0-9]{40}';
var validateEmailRequestsCodePattern = '[a-f0-9]{40}';

var uploadHashPattern = '[a-f0-9]{40}';

var config = {
    ENV: process.env.NODE_ENV,

    PORT: process.env.PORT,

    EVENID_MONGODB: {
        URI: process.env.MONGODB_PORT_27017_TCP_ADDR 
                ? ('mongodb://'
                    + process.env.MONGODB_PORT_27017_TCP_ADDR
                    + ':' 
                    + process.env.MONGODB_PORT_27017_TCP_PORT
                    + '/test')
                : process.env.MONGODB_URI,
        OBJECT_ID_PATTERN: mongoDBObjectIDPattern
    },

    EVENID_ERRORS: {
        REDIRECT_BLACKLIST: [
            // Routes which have no 
            // GET method like
            '^/users/' 
                + mongoDBObjectIDPattern 
                + '/profil-photos$',
            '^/clients/' 
                + mongoDBObjectIDPattern 
                + '/logos$'
        ],
        
        REDIRECT_GET: {/* See below */},
        REDIRECT_POST:  {/* See below */}
    },

    EVENID_LOCALES: {
        ENABLED: ['en-us', 'fr-fr'],
        DEFAULT: 'en-us'
    },

    EVENID_COOKIES_SECRET: process.env.EVENID_COOKIES_SECRET,

    EVENID_SESSIONS_CONFIGURATION: {
        name: 'sessid',
        secret: process.env.EVENID_SESSIONS_SECRET,
        cookie:{
            path: '/',
            httpOnly: true,
            secure: validator.toBoolean(process.env.EVENID_SESSIONS_SECURE_COOKIE),
            domain: process.env.EVENID_SESSION_COOKIE_DOMAIN,
            maxAge: null
        },
        // Forces session to be saved 
        // even when unmodified. (default: true)
        // Set here to avoid warning.
        resave: false,
        // Forces a session that is 'uninitialized' 
        // to be saved to the store. 
        // A session is uninitialized when 
        // it is new but not modified. 
        // This is useful for implementing 
        // login sessions, reducing server storage usage, 
        // or complying with laws that require
        // permission before setting a cookie. 
        // (default: true)
        // Set here to avoid warning.
        saveUninitialized: false
    },

    EVENID_STATIC_CONFIGURATION: {
        // Normalize a string path, taking care of '..' and '.' parts.
        directory: path.normalize(__dirname + '/../public'), 
        options: {
            'maxAge': parseInt(process.env.EVENID_STATIC_MAX_AGE)
        }
    },

    EVENID_I18N_LOCALE_COOKIE: {
        name: 'i18n_locale',
        // Ten year in ms
        maxAge: 86400 * 365 * 10 * 1000,
        secure: validator.toBoolean(process.env.EVENID_I18N_LOCALE_SECURE_COOKIE),
        domain: process.env.EVENID_I18N_LOCALE_COOKIE_DOMAIN,
        path: '/',
        httpOnly: true,
        signed: true
    },

    EVENID_PERSISTENT_LOGIN_COOKIE: {
        name: 'persistent_login',
        // Ten year in ms
        maxAge: 86400 * 365 * 10 * 1000,
        secure: validator.toBoolean(process.env.EVENID_PERSISTENT_LOGIN_SECURE_COOKIE),
        domain: process.env.EVENID_PERSISTENT_LOGIN_COOKIE_DOMAIN,
        path: '/',
        httpOnly: true,
        signed: true
    },

    EVENID_TEST_ACCOUNT_COOKIE: {
        // Append client ID
        name: 'test_account_%s',
        // Ten year in ms
        maxAge: 86400 * 365 * 10 * 1000,
        secure: validator.toBoolean(process.env.EVENID_TEST_ACCOUNT_SECURE_COOKIE),
        domain: process.env.EVENID_TEST_ACCOUNT_COOKIE_DOMAIN,
        path: '/',
        httpOnly: true,
        signed: true
    },

    // Avoid `Open redirect` issue
    EVENID_LOGOUT_VALID_REDIRECT_URIS: ['^/login$', '^/oauth/authorize\\?[^?]+$'],

    EVENID_UPLOADS: {
        HASH_PATTERN: uploadHashPattern
    },

    EVENID_USERS: {
        MAX_LENGTHS: {
            PASSWORD: 6,
            NICKNAME: 50,
            FIRST_NAME: 50,
            LAST_NAME: 50
        },

        MAX_ENTITIES_DISPLAYED: {
            EMAILS: 2,
            PHONE_NUMBERS: 2,
            ADDRESSES: 1
        }
    },

    EVENID_OAUTH_CLIENTS: {
        MAX_ENTITIES_DISPLAYED: {
            REDIRECTION_URIS: 1,
            NOTIFICATION_HANDLERS: 1
        },

        MAX_LENGTHS: {
            NAME: 25,
            WEBSITE: 50,
            DESCRIPTION: 50,
            FACEBOOK_USERNAME: 25,
            TWITTER_USERNAME: 25,
            INSTAGRAM_USERNAME: 25,
        }
    },

    EVENID_OAUTH_REDIRECTION_URIS: {
        MAX_LENGTHS: {
            URI: 150
        }
    },

    EVENID_OAUTH_HOOKS: {
        MAX_LENGTHS: {
            URL: 150
        }
    },

    EVENID_USER_RESET_PASSWORD_REQUESTS: {
        CODE: {
            PATTERN: resetPasswordRequestsCodePattern
        }
    },

    EVENID_USER_VALIDATE_EMAIL_REQUESTS: {
        CODE: {
            PATTERN: validateEmailRequestsCodePattern
        }
    },

    EVENID_EMAILS: {
        MAX_LENGTHS: {
            ADDRESS: 50
        }
    },

    EVENID_ADDRESSES: {
        MAX_LENGTHS: {
            FULL_NAME: 100,
            ADDRESS_LINE_1: 100,
            ADDRESS_LINE_2: 100,
            ACCESS_CODE: 10,
            CITY: 50,
            STATE: 50,
            POSTAL_CODE: 50
        }
    },

    EVENID_PHOTOS: {
        AVAILABLE_SIZES: [25, 50, 100, 200],
        
        MAX_FILE_SIZES: {
            // 100 KB
            CLIENT_LOGOS: 102400,
            // 4MB
            USER_PROFIL_PHOTOS: 4194304
        }
    },

    EVENID_APP: {
        CLIENT_ID: process.env.EVENID_APP_CLIENT_ID,
        CLIENT_SECRET: process.env.EVENID_APP_CLIENT_SECRET
    },

    EVENID_API: {
        ENDPOINT: process.env.API_PORT_8000_TCP_ADDR
            ? ('http://'
                + process.env.API_PORT_8000_TCP_ADDR
                + ':' 
                + process.env.API_PORT_8000_TCP_PORT)
            : process.env.EVENID_API_ENDPOINT,

        OAUTH_TOKENS: {
            PATTERN: oauthTokenPattern
        },

        CLIENT_SECRETS: {
            PATTERN: clientSecretPattern
        }
    },

    EVENID_AWS: {
        CLOUDFRONT: {
            URLS: {
                ASSETS: process.env.EVENID_AWS_CLOUDFRONT_ASSETS_URL,
                UPLOADS: process.env.EVENID_AWS_CLOUDFRONT_UPLOADS_URL
            }
        },
        
        S3: {
            REDIRECT_PATH: process.env.EVENID_AWS_S3_REDIRECT_PATH,
            BUCKET: {
                AUTHORIZED_KEYS: [
                    '^users/profil-photos/' + uploadHashPattern + '$',
                    '^clients/logos/' + uploadHashPattern + '$'
                ]
            }
        }
    },

    EVENID_RECAPTCHA: {
        PUBLIC_KEY: process.env.EVENID_RECAPTCHA_PUBLIC_KEY
    },

    EVENID_VIEWS: {
        NO_STATE_FOR_ADDRESSES: ['fr-fr'],

        UNLOGGED_USER_FORMS: [
            '^/login$', 
            '^/register$', 
            '^/recover-password$', 
            '^/recover-password/' + resetPasswordRequestsCodePattern + '$'
        ]
    }
};

config.EVENID_ERRORS.REDIRECT_GET['^/recover-password/' + resetPasswordRequestsCodePattern + '$'] = {
    path: '/recover-password'
};
config.EVENID_ERRORS.REDIRECT_GET['^/oauth/authorize(?=.*flow=recover_password)(?=.*code=.+)'] = {
    path: '/oauth/authorize',
    qsParametersToDelete: ['code']
};

config.EVENID_ERRORS.REDIRECT_POST['^/users/(' + mongoDBObjectIDPattern + ')/emails/(' + mongoDBObjectIDPattern + ')/validate'] = {
    path: '/users/$1/emails'
};

config.EVENID_ERRORS.REDIRECT_POST['^/logout$'] = {
    path: '/user-redirect'
};

module.exports = config; 