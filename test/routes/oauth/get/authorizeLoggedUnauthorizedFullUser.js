var querystring = require('querystring');

var assert = require('assert');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var fillUserForOauthAuthorize = require('../../../../testUtils/tests/fillUserForOauthAuthorize');

var IsInput = require('../../../../testUtils/validators/isInput');
var IsSelect = require('../../../../testUtils/validators/isSelect');

var isValidOauthSelectAuthForm = require('../../../../testUtils/validators/isValidOauthSelectAuthForm');

var request = null;
var csrfToken = null;
var user = null;
var landlinePhoneNumber = null;
var mobilePhoneNumber = null;
var address = null;
var client = null;
var redirectionURI = null;
var formFieldsToAuthorize = null;

var makeARequest = null;

describe('GET /oauth/authorize (Logged user) (Unauthorized user) (Full user)', function () {
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
            formFieldsToAuthorize = resp.formFieldsToAuthorize;

            fillUserForOauthAuthorize(csrfToken, user.id, request, function (err, resp) {
                makeARequest = function (flow, statusCode, cb) {
                    var query = null;

                    if (err) {
                        return done(err);
                    }

                    user = resp.user;
                    landlinePhoneNumber = resp.landlinePhoneNumber;
                    mobilePhoneNumber = resp.mobilePhoneNumber;
                    address = resp.address;

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

    it('redirects to registration flow ' +
       'when user try to log in to client for the first time', function (done) {
        
        makeARequest('login', 302, function (err, resp) {
            var isInput = null;
            var isSelect = null;
            
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

    it('displays authorizations form when '
       + 'missing authorizations during registration', function (done) {
        
        makeARequest('registration', 200, function (err, resp) {
            var isInput = null;
            var isSelect = null;
            
            if (err) {
                return done(err);
            }

            isInput = IsInput(resp.text);
            isSelect = IsSelect(resp.text);

            assert.ok(!!resp.text.match(/will be allowed to access to/));

            isValidOauthSelectAuthForm(user, address, mobilePhoneNumber, landlinePhoneNumber)
                                      (formFieldsToAuthorize, isInput, isSelect);

            done();
        });
    });
});