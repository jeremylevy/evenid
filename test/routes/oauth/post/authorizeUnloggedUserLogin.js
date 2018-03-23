var querystring = require('querystring');

var assert = require('assert');
var mongoose = require('mongoose');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');
var updateOauthRedirectionURI = require('../../../../testUtils/clients/updateRedirectionURI');

var IsInput = require('../../../../testUtils/validators/isInput');
var IsSelect = require('../../../../testUtils/validators/isSelect');

var isValidOauthSelectAuthForm = require('../../../../testUtils/validators/isValidOauthSelectAuthForm');
var isValidOauthAuthorizeSuccessRedirect = require('../../../../testUtils/validators/isValidOauthAuthorizeSuccessRedirect');

var beforeHookResp = null;
var request = null;
var csrfToken = null;
var user = null;
var client = null;
var redirectionURI = null;

var makeARequest = null;

describe('POST /oauth/authorize (Unlogged User) (Login)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            beforeHookResp = resp;
            user = resp.user;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;
                csrfToken = resp.csrfToken;

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
                        flow: 'login'
                    };

                    // Request save session cookie sent,
                    // so make sure we start with logged out user
                    // for each tests.
                    request.post('/logout')
                           .set('Content-Type', 'application/x-www-form-urlencoded')
                           .send({_csrf: csrfToken}).end(function (err, res) {
                        
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
                    });
                };

                done();
            });
        });
    });

    it('displays invalid email error when '
       + 'invalid user email', function (done) {
       
        var userEmail = 'bar' + mongoose.Types.ObjectId().toString() + '@evenid.com';

        makeARequest({
            email: userEmail,
            password: mongoose.Types.ObjectId().toString(),
            _csrf: csrfToken
        }, 302, function (err, resp) {
            var isInput = null;
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(new RegExp('^/oauth/authorize\\?')));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                isInput = IsInput(resp.text);

                isInput('email', 'email', '');
                isInput('password', 'password', '');
                isInput('checkbox', 'persistent_login', '', 'checked');

                assert.ok(!!resp.text.match(/This email address does not exist/));

                done();
            });
        });
    });
    
    it('displays invalid password error when '
       + 'invalid user password', function (done) {

        // We need another user 
        // given that we made an 
        // invalid login and that
        // we don't want next tests
        // to be stopped by captcha
        oauthAuthorizeBeforeHook(function (err, resp) {
            var user = resp && resp.user;

            if (err) {
                return done(err);
            }

            makeARequest({
                email: user.email,
                password: mongoose.Types.ObjectId().toString(),
                _csrf: csrfToken
            }, 302, function (err, resp) {
                var isInput = null;
                
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.headers.location.match(new RegExp('^/oauth/authorize\\?')));

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    isInput = IsInput(resp.text);

                    // Make sure email was prefilled
                    isInput('email', 'email', user.email);
                    isInput('password', 'password', '');
                    isInput('checkbox', 'persistent_login', '', 'checked');

                    assert.ok(!!resp.text.match(/Your password is invalid./));

                    done();
                });
            });
        });
    });

    it('redirects to registration flow when user try '
       + 'to log in to client for the first time', function (done) {
        
        makeARequest({
            email: user.email,
            password: user.password,
            _csrf: csrfToken
        }, 302, function (err, resp) {
            var isInput = null;
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(/flow=registration/));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/You are not registered on/));

                done();
            });
        });
    });

    it('redirects to login to ask for shipping address when `separate_shipping_billing_address` '
       + 'was set alongs with no missing authorizations', function (done) {
        
        authorizeOauthClientForUser(beforeHookResp, function (err, resp) {
            var redirectionURI = beforeHookResp.redirectionURICode;

            if (err) {
                return done(err);
            }

            makeARequest.call({
                redirectionURI: redirectionURI
            }, {
                email: user.email,
                password: user.password,
                _csrf: csrfToken
            }, 302, function (err, resp) {
                var isInput = null;
                
                if (err) {
                    return done(err);
                }


                assert.ok(!!resp.headers.location.match(/flow=login/));

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    isInput = IsInput(resp.text);
                    isSelect = IsSelect(resp.text);

                    assert.ok(!!resp.text.match(/needs additional information/));

                    // 1: user, 2: address, 3: mobile phone number, 4: landline phone number
                    // Pass empty id for address in order to not validate select value
                    // we don't know the address id
                    isValidOauthSelectAuthForm(null, {id: ''}, null, null)
                                              (['shipping_address', 'billing_address'], isInput, isSelect);

                        done();
                    });
            });
        });
    });

    it('redirects to oauth client redirection uri '
       + 'when no missing authorizations', function (done) {
        
        var redirectionURI = beforeHookResp.redirectionURIToken;
        var update = {
            redirect_uri: redirectionURI.redirect_uri,
            authorizations: redirectionURI.authorizations,
            authorization_flags: {},
            response_type: redirectionURI.response_type
        };

        // Shipping/billing addresses are confirmed on each login
        // so in order to test for choose account step we must remove
        // `separate_shipping_billing_address` from redirection URI scope flags
        updateOauthRedirectionURI(csrfToken, client.id, redirectionURI.id, 
                                  update, request, function (err, updatedRedirectionURI) {
            if (err) {
                return done(err);
            }

            makeARequest.call({
                redirectionURI: redirectionURI
            }, {
                email: user.email,
                password: user.password,
                _csrf: csrfToken
            }, 302, function (err, resp) {
                var isInput = null;
                
                if (err) {
                    return done(err);
                }

                isValidOauthAuthorizeSuccessRedirect('token', 
                                                     redirectionURI.redirect_uri, 
                                                     resp.headers.location);

                done();
            });
        });
    });
});