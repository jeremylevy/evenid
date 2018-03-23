var querystring = require('querystring');

var assert = require('assert');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var updateOauthRedirectionURI = require('../../../../testUtils/clients/updateRedirectionURI');

var isValidOauthAuthorizeSuccessRedirect = require('../../../../testUtils/validators/isValidOauthAuthorizeSuccessRedirect');

var request = null;
var csrfToken = null;
var user = null;
var client = null;
var redirectionURI = null;
var beforeHookResp = null;

var makeARequest = null;

describe('POST /oauth/authorize (Logged user) (Authorized user)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            beforeHookResp = resp;
            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            authorizeOauthClientForUser(resp, function (err, resp) {
                if (err) {
                    return done(err);
                }

                makeARequest = function (flow, data, statusCode, cb) {
                    var context = this;
                    var _redirectionURI = (context.redirectionURI || redirectionURI);
                    var query = null;

                    if (err) {
                        return done(err);
                    }

                    query = {
                        client_id: client.client_id.toString(),
                        redirect_uri: _redirectionURI.redirect_uri,
                        state: 'foo',
                        flow: flow
                    };

                    data = data || {};
                    data._csrf = csrfToken;

                    request
                        .post('/oauth/authorize?' + querystring.stringify(query))
                        .set('Content-Type', 'application/x-www-form-urlencoded')
                        .send(data)
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

    it('redirects to login flow when `separate_shipping_billing_address` flag was set '
       + 'and shipping address was not sent', function (done) {

        makeARequest('login', {}, 302, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(/flow=login/));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/needs additional information/));
                assert.ok(!!resp.text.match(/This form contains invalid fields/));
                assert.ok(!!resp.text.match(/Your shipping address/));

                done();
            });
        });
    });

    it('redirects to oauth client redirection uri '
        + 'when code response type and `separate_shipping_billing_address` flag '
        + 'was set', function (done) {

        var redirectionURI = beforeHookResp.redirectionURICode;
        var validFormData = beforeHookResp.validFormData();

        // We don't know the authorized shipping address ID
        // so send it another
        validFormData.shipping_address = 'use_another';
        validFormData.use_as_billing_address = '1';

        makeARequest.call({
            redirectionURI: redirectionURI
        }, 'login', validFormData, 302, function (err, resp) {
            if (err) {
                return done(err);
            }

            isValidOauthAuthorizeSuccessRedirect('code', 
                                                 redirectionURI.redirect_uri, 
                                                 resp.headers.location);

            done();
        });
    });

    it('redirects to oauth client redirection uri '
        + 'when token response type and `separate_shipping_billing_address` '
        + 'was set', function (done) {

        var redirectionURI = beforeHookResp.redirectionURIToken;
        var validFormData = beforeHookResp.validFormData();

        // We don't know the authorized shipping address ID
        // so send it another
        validFormData.shipping_address = 'use_another';
        validFormData.use_as_billing_address = '1';

        makeARequest.call({
            redirectionURI: redirectionURI
        }, 'login', validFormData, 302, function (err, resp) {
            if (err) {
                return done(err);
            }

            isValidOauthAuthorizeSuccessRedirect('token', 
                                                 redirectionURI.redirect_uri, 
                                                 resp.headers.location);

            done();
        });
    });

    it('redirects to oauth client redirection uri '
        + 'when code response type and `separate_shipping_billing_address` flag '
        + 'was not set', function (done) {

        var redirectionURI = beforeHookResp.redirectionURICode;
        var update = {
            redirect_uri: redirectionURI.redirect_uri,
            authorizations: redirectionURI.authorizations,
            authorization_flags: {
                phone_numbers: redirectionURI.authorization_flags.phone_numbers
            },
            response_type: redirectionURI.response_type
        };

        // Shipping/billing addresses are confirmed on each login
        // so in order to test POST method for choose account step we must remove
        // `separate_shipping_billing_address` from redirection URI scope flags
        updateOauthRedirectionURI(csrfToken, client.id, redirectionURI.id, 
                                  update, request, function (err, redirectionURI) {

            if (err) {
                return done(err);
            }

            makeARequest.call({
                redirectionURI: redirectionURI
            }, 'login', {}, 302, function (err, resp) {
                if (err) {
                    return done(err);
                }

                isValidOauthAuthorizeSuccessRedirect('code', 
                                                     redirectionURI.redirect_uri, 
                                                     resp.headers.location);

                done();
            });
        });
    });
    
    it('redirects to oauth client redirection uri '
        + 'when token response type and `separate_shipping_billing_address` flag '
        + 'was not set', function (done) {

        var redirectionURI = beforeHookResp.redirectionURIToken;
        var update = {
            redirect_uri: redirectionURI.redirect_uri,
            authorizations: redirectionURI.authorizations,
            authorization_flags: {
                phone_numbers: redirectionURI.authorization_flags.phone_numbers
            },
            response_type: redirectionURI.response_type
        };

        // Shipping/billing addresses are confirmed on each login
        // so in order to test POST method for choose account step we must remove
        // `separate_shipping_billing_address` from redirection URI scope flags
        updateOauthRedirectionURI(csrfToken, client.id, redirectionURI.id, 
                                  update, request, function (err, redirectionURI) {

            if (err) {
                return done(err);
            }

            makeARequest.call({
                redirectionURI: redirectionURI
            }, 'login', {}, 302, function (err, resp) {
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