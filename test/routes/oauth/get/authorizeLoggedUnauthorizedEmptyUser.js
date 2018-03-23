var querystring = require('querystring');

var assert = require('assert');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');

var IsInput = require('../../../../testUtils/validators/isInput');
var IsSelect = require('../../../../testUtils/validators/isSelect');

var isValidOauthFillAuthForm = require('../../../../testUtils/validators/isValidOauthFillAuthForm');

var request = null;
var csrfToken = null;
var user = null;
var client = null;
var redirectionURI = null;
var fullFormFields = null;

var makeARequest = null;

describe('GET /oauth/authorize (Logged user) (Unauthorized user) (Empty user)', function () {
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
            fullFormFields = resp.fullFormFields;

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

    it('redirects to registration flow ' +
       'when user try to log in to client for the first time', function (done) {
        
        makeARequest('login', 302, function (err, resp) {
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

    it('displays authorizations form during registration', function (done) {
        var expectedFields = fullFormFields.filter(function (field) {
            // We expect shipping/billing address and mobile/landline phone number
            return ['address_address_type', 'address_country', 
                    'address_postal_code', 'address_city', 
                    'address_address_line_1', 'address_full_name',
                    'phone_number_country', 'phone_number_number'].indexOf(field) === -1;
        });

        makeARequest('registration', 200, function (err, resp) {
            var isInput = null;
            var isSelect = null;
            
            if (err) {
                return done(err);
            }

            isInput = IsInput(resp.text);
            isSelect = IsSelect(resp.text);

            assert.ok(!!resp.text.match(/will be allowed to access to/));

            isValidOauthFillAuthForm(expectedFields, isInput, isSelect);

            done();
        });
    });
});