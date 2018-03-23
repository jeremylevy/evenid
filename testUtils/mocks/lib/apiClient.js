var nock = require('nock');
var querystring = require('querystring');

var config = require('../../../config');

var data = require('../data/ApiClient');

var validClientID = data.clientID;
var validClientSecret = data.clientSecret;

var validAccessToken = data.accessToken;
var validRefreshToken = data.refreshToken;

var validApiEndpoint = data.apiEndpoint;

var refreshedAccessToken = data.refreshedAccessToken;
var refreshedRefreshToken = data.refreshedRefreshToken;

var validUserID = data.userID;

var XOriginatingIP = data.userIPAddress;
var validUserLang = data.userLang;

/* For unauthorized tokens */

// First, api client makes request to this
nock(validApiEndpoint, {
    reqheaders: {
        'Authorization': 'Bearer ' + validAccessToken,
        'X-Originating-IP': XOriginatingIP
    }
})['get']('/test-expired-token-for-unauthorized-app')
.query({
    lang: validUserLang
})
.reply(400, {error: {type: 'expired_token'}});

// Then, tries to refresh token
nock(validApiEndpoint, {
    reqheaders: {
        'Authorization': 'Basic ' 
                        + new Buffer(validClientID
                                     + ':' 
                                     + validClientSecret).toString('base64'),
        'X-Originating-IP': XOriginatingIP
    }
})['post']('/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: validRefreshToken
}).query({
    lang: validUserLang
}).reply(200, {
    access_token: refreshedAccessToken, 
    refresh_token: refreshedRefreshToken,
    token_type: 'Bearer',
    expires_in: 3600
});

// Finally, recalls the same 
// method with refreshed access token
nock(validApiEndpoint, {
    reqheaders: {
        'Authorization': 'Bearer ' + refreshedAccessToken,
        'X-Originating-IP': XOriginatingIP
    }
})['get']('/test-expired-token')
.query({
    lang: validUserLang
})
.reply(200, {status: 'ok'});

/* END */

/* For authorized tokens */

// First, api client makes request to this
nock(validApiEndpoint, {
    reqheaders: {
        'Authorization': 'Bearer ' + validAccessToken,
        'X-Originating-IP': XOriginatingIP
    }
})['get']('/test-expired-token-for-authorized-app')
.query({
    lang: validUserLang
})
.reply(400, {error: {type: 'expired_token'}});

// Then, tries to refresh token
nock(validApiEndpoint, {
    reqheaders: {
        'Authorization': 'Basic ' 
                        + new Buffer(validClientID
                                     + ':' 
                                     + validClientSecret).toString('base64'),
        'X-Originating-IP': XOriginatingIP
    }
})['post']('/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: validRefreshToken
})
.query({
    lang: validUserLang
})
.reply(200, {
    user_id: validUserID,
    access_token: refreshedAccessToken, 
    refresh_token: refreshedRefreshToken,
    token_type: 'Bearer',
    expires_in: 3600,
    user_status: 'new_user'
});

// Finally, recalls the same 
// method with refreshed access token
nock(validApiEndpoint, {
    reqheaders: {
        'Authorization': 'Bearer ' + refreshedAccessToken,
        'X-Originating-IP': XOriginatingIP
    }
})['get']('/test-expired-token')
.query({
    lang: validUserLang
})
.reply(200, {status: 'ok'});

/* END */

// It sets unauthenticated tokens in session when 
// oauth token endpoint was called the first time 
// with `client_credentials` grant type.
nock(validApiEndpoint, {
    reqheaders: {
        'Authorization': 'Basic ' 
                        + new Buffer(validClientID
                                     + ':' 
                                     + validClientSecret).toString('base64'),
        'X-Originating-IP': XOriginatingIP
    }
})['post']('/oauth/token', {
    grant_type: 'client_credentials'
})
.query({
    lang: validUserLang
})
.reply(200, {
    access_token: refreshedAccessToken, 
    refresh_token: refreshedRefreshToken,
    token_type: 'Bearer',
    expires_in: 3600
});