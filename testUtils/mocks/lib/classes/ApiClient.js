var nock = require('nock');
var querystring = require('querystring');

var config = require('../../../../config');

var data = require('../../data/ApiClient');

var validClientID = data.clientID;
var validClientSecret = data.clientSecret;

var validAccessToken = data.accessToken;
var validRefreshToken = data.refreshToken;

var validApiEndpoint = data.apiEndpoint;

var refreshedAccessToken = data.refreshedAccessToken;
var refreshedRefreshToken = data.refreshedRefreshToken;

var XOriginatingIP = data.userIPAddress;
var validUserLang = data.userLang;

var httpMethods = ['get', 'post', 'put', 'delete'];
var httpPaths = ['/test', '/test-error', '/test-oauth-error', '/test-server-error'];

var expectedData = {
    foo: 'bar',
    bar: 'foo'
};

httpMethods.forEach(function (method) {
    httpPaths.forEach(function (httpPath) {
        var uri = httpPath;
        var qs = {};

        if (method === 'get') {
            qs = expectedData;
        }

        qs.lang = validUserLang;

        if (httpPath === '/test') {
            nock(validApiEndpoint, {
                reqheaders: {
                    'Authorization': 'Bearer ' + validAccessToken,
                    'X-Originating-IP': XOriginatingIP
                }
            })[method](uri, method === 'get' ? undefined : expectedData)
                .query(qs)
                .reply(200, {
                    status: 'ok'
                });
        }

        if (httpPath === '/test-error') {
            nock(validApiEndpoint, {
                reqheaders: {
                    'Authorization': 'Bearer ' + validAccessToken,
                    'X-Originating-IP': XOriginatingIP
                }
            })[method](uri, method === 'get' ? undefined : expectedData)
                .query(qs)
                .reply(400, {error: {
                    type: 'invalid_token',
                    messages: {
                        main: 'Your access token is invalid.'
                    }
                }});
        }

        if (httpPath === '/test-oauth-error') {
            nock(validApiEndpoint, {
                reqheaders: {
                    'Authorization': 'Bearer ' + validAccessToken,
                    'X-Originating-IP': XOriginatingIP
                }
            })[method](uri, method === 'get' ? undefined : expectedData)
                .query(qs)
                .reply(400, {
                    error: 'invalid_grant',
                    invalid_email: true,
                    invalid_password: false
                });
        }

        // Test server error by 
        // returning non-JSON response
        if (httpPath === '/test-server-error') {
            nock(validApiEndpoint, {
                reqheaders: {
                    'Authorization': 'Bearer ' + validAccessToken,
                    'X-Originating-IP': XOriginatingIP
                }
            })[method](uri, method === 'get' ? undefined : expectedData)
                .query(qs)
                .reply(500, 'bar');
        }
    });
});

// First, api client makes request to this
nock(validApiEndpoint, {
    reqheaders: {
        'Authorization': 'Bearer ' + validAccessToken,
        'X-Originating-IP': XOriginatingIP
    }
})['get']('/test-expired-token')
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
    access_token: refreshedAccessToken, 
    refresh_token: refreshedRefreshToken
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