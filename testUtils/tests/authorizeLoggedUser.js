var querystring = require('querystring');

var assert = require('assert');

var oauthAuthorizeBeforeHook = require('../tests/oauthAuthorizeBeforeHook');

var isInvalidRequestResponse = require('../validators/isInvalidRequestResponse');
var isValidOauthAuthorizeSuccessRedirect = require('../validators/isValidOauthAuthorizeSuccessRedirect');

module.exports = function (flow) {
    var beforeHookResp = null;
    var request = null;
    var csrfToken = null;
    var user = null;
    var client = null;
    var redirectionURI = null;
    var fullFormFields = null;

    var makeARequest = null;

    describe('POST /oauth/authorize (Logged user) (Unauthorized user) (' + flow + ')', function () {
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
                fullFormFields = resp.fullFormFields;

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
                        flow: flow
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

                done();
            });
        });

        it('displays errors when empty form data', function (done) {
            var expectedFields = fullFormFields.filter(function (field) {
                // We expect shipping/billing address and mobile/landline phone number
                return ['address_address_type', 'address_country', 
                        'address_postal_code', 'address_city', 
                        'address_address_line_1', 'address_full_name',
                        'phone_number_country', 'phone_number_number'].indexOf(field) === -1;
            });

            makeARequest({_csrf: csrfToken}, 302, function (err, resp) {
                var isInput = null;
                
                if (err) {
                    return done(err);
                }

                // User try to register for the first time using login flow
                // it will be redirected to registration flow
                if (flow === 'login') {
                    assert.ok(!!resp.headers.location.match(/flow=registration/));
                }

                assert.ok(!!resp.headers.location.match(new RegExp('^/oauth/authorize\\?')));

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    // User try to register for the first time using login flow
                    // it will be redirected to registration flow
                    if (flow === 'login') {
                        assert.ok(!!resp.text.match(/You are not registered on/));

                        return done();
                    }

                    isInvalidRequestResponse(resp.text);

                    assert.strictEqual(resp.text.match(/must be set/g).length, 
                                       expectedFields.length);

                    done();
                });
            });
        });

        it('displays errors when invalid form data', function (done) {
            var data = beforeHookResp.validFormData();
            var invalidFormFields = beforeHookResp.invalidFormFields;

            data._csrf = csrfToken;

            invalidFormFields.forEach(function (field) {
                if (field === 'date_of_birth') {
                    data.date_of_birth_month = 'bar';
                    data.date_of_birth_day = 'bar';
                    data.date_of_birth_year = 'bar';

                    return;
                }

                data[field] = 'bar';
            });

            makeARequest(data, 302, function (err, resp) {
                var isInput = null;
                
                if (err) {
                    return done(err);
                }

                // User try to register for the first time using login flow
                // it will be redirected to registration flow
                if (flow === 'login') {
                    assert.ok(!!resp.headers.location.match(/flow=registration/));
                }

                assert.ok(!!resp.headers.location.match(new RegExp('^/oauth/authorize\\?')));

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    // User try to register for the first time using login flow
                    // it will be redirected to registration flow
                    if (flow === 'login') {
                        assert.ok(!!resp.text.match(/You are not registered on/));

                        return done();
                    }

                    isInvalidRequestResponse(resp.text);

                    assert.strictEqual(resp.text.match(/error-wrapper/g).length, 
                                       invalidFormFields.length);

                    done();
                });
            });
        });
        
        it('redirects to oauth client redirection uri '
           + 'when valid form data and code response type', function (done) {

            var redirectionURI = beforeHookResp.redirectionURICode;
            var data = beforeHookResp.validFormData();

            data._csrf = csrfToken;

            makeARequest.call({
                redirectionURI: redirectionURI
            }, data, 302, function (err, resp) {
                var isInput = null;
                
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
           + 'when valid form data and token response type', function (done) {

            var redirectionURI = beforeHookResp.redirectionURIToken;
            var data = beforeHookResp.validFormData();

            data._csrf = csrfToken;

            makeARequest.call({
                redirectionURI: redirectionURI
            }, data, 302, function (err, resp) {
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
};