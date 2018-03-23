var querystring = require('querystring');

var assert = require('assert');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var updateOauthRedirectionURI = require('../../../../testUtils/clients/updateRedirectionURI');

var IsInput = require('../../../../testUtils/validators/isInput');
var IsSelect = require('../../../../testUtils/validators/isSelect');
var isValidOauthSelectAuthForm = require('../../../../testUtils/validators/isValidOauthSelectAuthForm');

var request = null;
var csrfToken = null;
var user = null;
var client = null;
var redirectionURI = null;
var userSent = null;

var makeARequest = null;

describe('GET /oauth/authorize (Logged user) (Authorized user)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            authorizeOauthClientForUser(resp, function (err, resp) {
                if (err) {
                    return done(err);
                }

                userSent = resp.formData;

                makeARequest = function (flow, statusCode, cb) {
                    var query = null;

                    if (err) {
                        return done(err);
                    }

                    query = {
                        client_id: client.client_id.toString(),
                        redirect_uri: redirectionURI.redirect_uri,
                        state: 'foo',
                        flow: flow
                    };

                    request
                        .get('/oauth/authorize?' + querystring.stringify(query))
                        .expect(statusCode, function (err, res) {
                            if (err) {
                                return cb(err);
                            }

                            cb(null, res);
                        });
                };

                done();
            });
        });
    });
    
    it('redirects to login flow when user '
       + 'try to register to client for the '
       + 'second time', function (done) {
        
        makeARequest('registration', 302, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(/flow=login/));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/You are already registered on/));

                done();
            });
        });
    });

    it('displays shipping address when '
       + '`separate_shipping_billing_address` '
       + 'flag was set', function (done) {
        
        var update = {
            redirect_uri: redirectionURI.redirect_uri,
            authorizations: redirectionURI.authorizations,
            authorization_flags: {
                addresses: 'separate_shipping_billing_address'
            },
            response_type: redirectionURI.response_type
        };

        // Shipping/billing addresses are confirmed on each login
        // so in order to test for choose account step we must remove
        // `separate_shipping_billing_address` from redirection URI scope flags
        updateOauthRedirectionURI(csrfToken, client.id, redirectionURI.id, 
                                  update, request, function (err, redirectionURI) {
            
            if (err) {
                return done(err);
            }

            makeARequest('login', 200, function (err, resp) {
                var isInput = null;
                var isSelect = null;

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

    it('displays choose account form during login flow', function (done) {
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
                                  update, request, function (err, redirectionURI) {
            
            if (err) {
                return done(err);
            }

            makeARequest('login', 200, function (err, resp) {
                var reg = new RegExp('Continue as ' 
                                     + userSent.first_name 
                                     + ' ' 
                                     + userSent.last_name, 'i');
                
                if (err) {
                    return done(err);
                }
                
                assert.ok(!!resp.text.match(reg));

                done();
            });
        });
    });
});