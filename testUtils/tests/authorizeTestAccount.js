var querystring = require('querystring');

var assert = require('assert');
var mongoose = require('mongoose');

var config = require('../../config');

var getUnloggedRequest = require('../getUnloggedRequest');

var updateClient = require('../clients/update');

var oauthAuthorizeBeforeHook = require('../tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../tests/authorizeOauthClientForUser');

var IsInput = require('../validators/isInput');
var isValidOauthAuthorizeSuccessRedirect = require('../validators/isValidOauthAuthorizeSuccessRedirect');

var isSuccessRedirect = function (config, userState, clientID, 
                                  responseType, redirectionURI, resp) {
    
    // Signed cookie: test_account=s%3ATEST_ACCOUNT_ID.SIGNATURE
    var testAccountCookieReg = new RegExp('test_account_' + clientID + '=s%3A' 
                                          + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                                          + '\\..+(?=Max-Age='
                                                 // In ms
                                                 + (config.EVENID_TEST_ACCOUNT_COOKIE.maxAge / 1000)
                                                 + ')');

    // Make sure test account was set in cookie for future re-use
    if (userState === 'unlogged') {
        assert.ok(!!resp.headers['set-cookie'][0].match(testAccountCookieReg));
    }

    isValidOauthAuthorizeSuccessRedirect(responseType, 
                                         redirectionURI, 
                                         resp.headers.location);

};

module.exports = function (userState) {
    var beforeHookResp = null;
    var loggedRequest = null;
    var loggedCsrfToken = null;
    var request = null;
    var csrfToken = null;
    var user = null;
    var client = null;
    var redirectionURI = null;

    var makeARequest = null;

    describe('POST /oauth/authorize (' 
             + userState.charAt(0).toUpperCase() + userState.slice(1) 
             + ' user) (Use test account)', function () {
        
        before(function (done) {
            oauthAuthorizeBeforeHook(function (err, resp) {
                if (err) {
                    return done(err);
                }

                beforeHookResp = resp;
                loggedRequest = resp.request;
                loggedCsrfToken = resp.csrfToken;
                request = resp.request;
                csrfToken = resp.csrfToken;
                user = resp.user;
                client = resp.client;
                redirectionURI = resp.redirectionURI;

                makeARequest = function (data, statusCode, cb) {
                    var context = this;
                    var _redirectionURI = context.redirectionURI || redirectionURI;
                    var query = null;

                    if (err) {
                        return done(err);
                    }

                    query = {
                        client_id: client.client_id.toString(),
                        redirect_uri: _redirectionURI.redirect_uri,
                        state: 'foo',
                        flow: 'registration'
                    };

                    request
                        .post('/oauth/authorize?' + querystring.stringify(query))
                        // Body parser middleware need it in order to populate req.body
                        .set('Content-Type', 'application/x-www-form-urlencoded')
                        .send(data)
                        .expect(statusCode, function (err, res) {
                            if (err) {
                                return cb(err);
                            }

                            cb(null, res);
                        });
                };

                if (userState === 'unlogged') {
                    getUnloggedRequest(function (err, resp) {
                        if (err) {
                            return done(err);
                        }

                        request = resp.request;
                        csrfToken = resp.csrfToken;

                        done();
                    });

                    return;
                }

                done();
            });
        });
        
        it('redirects to oauth client redirection uri when client '
           + 'authorize test accounts and code response type', function (done) {

            var redirectionURI = beforeHookResp.redirectionURICode;

            updateClient(loggedCsrfToken, client.id, {
                authorize_test_accounts: 'true'
            }, loggedRequest, function (err, updatedClient) {
                
                if (err) {
                    return done(err);
                }

                makeARequest.call({
                    redirectionURI: redirectionURI
                }, {
                    use_test_account: 'true',
                    _csrf: csrfToken
                }, 302, function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    isSuccessRedirect(config, userState, client.id,
                                      'code', redirectionURI.redirect_uri, resp);

                    done();
                });
            });
        });

        it('redirects to oauth client redirection uri when '
           + 'client authorize test accounts and token response type', function (done) {

            var redirectionURI = beforeHookResp.redirectionURIToken;

            updateClient(loggedCsrfToken, client.id, {
                authorize_test_accounts: 'true'
            }, loggedRequest, function (err, updatedClient) {
                
                if (err) {
                    return done(err);
                }

                makeARequest.call({
                    redirectionURI: redirectionURI
                }, {
                    use_test_account: 'true',
                    _csrf: csrfToken
                }, 302, function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    isSuccessRedirect(config, userState, client.id,
                                      'token', redirectionURI.redirect_uri, resp);

                    done();
                });
            });
        });

        it('redirects to oauth form when client doesn\'t '
           + 'authorize test accounts and code response type', function (done) {

            updateClient(loggedCsrfToken, client.id, {
                authorize_test_accounts: 'false'
            }, loggedRequest, function (err) {
                
                if (err) {
                    return done(err);
                }

                makeARequest({
                    use_test_account: 'true',
                    _csrf: csrfToken
                }, 302, function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    assert.ok(!!resp.headers.location.match(new RegExp('/oauth/authorize')));

                    request.get(resp.headers.location).end(function (err, resp) {
                        if (err) {
                            return done(err);
                        }

                        assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

                        done();
                    });
                });
            });
        });
    });
};