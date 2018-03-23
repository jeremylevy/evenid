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

describe('POST /oauth/authorize (Logged user) (Semi-Authorized user)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook.call({
            redirectionURI: {
                // Start by authorizing a subset of full scope
                authorizations: ['emails', 'first_name', 'last_name'],
                authorization_flags: {}
            }
        }, function (err, resp) {
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

    /* This tests doesn't depends on response type 
       so you may set `code` response type for one 
       and `token` for the others and conversely */
    
    it('redirects to oauth client redirection uri '
       + 'when code response type and `addresses` scope without scope flags', function (done) {

        var dataToSend = beforeHookResp.validFormData();
        var redirectionURI = beforeHookResp.redirectionURICode;
        var update = {
            redirect_uri: redirectionURI.redirect_uri,
            authorizations: ['addresses'],
            authorization_flags: {},
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
            }, 'login', dataToSend, 302, function (err, resp) {
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
       + 'when token response type and `phone_numbers` scope without scope flags', function (done) {

        var dataToSend = beforeHookResp.validFormData();
        var redirectionURI = beforeHookResp.redirectionURIToken;
        var update = {
            redirect_uri: redirectionURI.redirect_uri,
            authorizations: ['phone_numbers'],
            authorization_flags: {},
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
            }, 'login', dataToSend, 302, function (err, resp) {
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