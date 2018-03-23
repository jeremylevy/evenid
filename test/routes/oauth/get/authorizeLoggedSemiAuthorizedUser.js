var querystring = require('querystring');

var assert = require('assert');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var updateOauthRedirectionURI = require('../../../../testUtils/clients/updateRedirectionURI');

var IsInput = require('../../../../testUtils/validators/isInput');
var IsSelect = require('../../../../testUtils/validators/isSelect');
var isValidOauthFillAuthForm = require('../../../../testUtils/validators/isValidOauthFillAuthForm');

var request = null;
var csrfToken = null;
var user = null;
var client = null;
var redirectionURI = null;
var userSent = null;

var makeARequest = null;

describe('GET /oauth/authorize (Logged user) (Semi-authorized user)', function () {
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

    it('redirects to login flow ' +
       'when user try to register to client for the second time', function (done) {
        
        makeARequest('registration', 302, function (err, resp) {
            var isInput = null;
            var isSelect = null;
            
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

    it('displays `needs additional information` on login', function (done) {
        var scope = ['profil_photo', 'gender', 
                     'nationality', 'timezone',
                     'place_of_birth'];
        
        var update = {
            redirect_uri: redirectionURI.redirect_uri,
            authorizations: scope,
            authorization_flags: {},
            response_type: redirectionURI.response_type
        };

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
                
                // Profil photo is displayed as an iframe
                assert.ok(!!resp.text.match(new RegExp('<iframe src="/oauth/authorize/profil-photo"')));

                isValidOauthFillAuthForm(scope, isInput, isSelect);

                done();
            });
        });
    });
});