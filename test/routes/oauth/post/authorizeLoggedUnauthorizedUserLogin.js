var querystring = require('querystring');

var assert = require('assert');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');

var request = null;
var csrfToken = null;
var client = null;
var redirectionURI = null;

var makeARequest = null;

describe('POST /oauth/authorize (Logged user) (Unauthorized user) (Login)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
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
                    flow: 'login'
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

    it('redirects to registration flow when unauthorized user try to send form', function (done) {
        makeARequest({_csrf: csrfToken}, 302, function (err, resp) {
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
});