var querystring = require('querystring');

var assert = require('assert');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var IsInput = require('../../../../testUtils/validators/isInput');
var isValidRecoverPasswordPage = require('../../../../testUtils/validators/isValidRecoverPasswordPage');

var beforeHookResp = null;
var loggedRequest = null;
var request = null;
var client = null;
var redirectionURI = null;

var makeARequest = null;

describe('GET /oauth/authorize (Recover password)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            beforeHookResp = resp;
            loggedRequest = resp.request;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;

                makeARequest = function (statusCode, request, cb) {
                    var context = this;
                    var query = null;

                    if (err) {
                        return done(err);
                    }

                    query = {
                        client_id: client.client_id.toString(),
                        redirect_uri: redirectionURI.redirect_uri,
                        state: 'foo',
                        flow: 'recover_password'
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

    it('redirects to registration flow when '
       + 'user is logged and hasn\'t authorized client', function (done) {
        
        makeARequest(302, loggedRequest, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(/flow=registration/));

            loggedRequest.get(resp.headers.location)
                         .end(function (err, resp) {
                
                if (err) {
                    return cb(err);
                }

                assert.ok(!!resp.text.match(/You must log out to see this page/));

                done();
            });
        });
    });

    it('redirects to login flow when user '
       + 'is logged and has authorized client', function (done) {
        
        authorizeOauthClientForUser(beforeHookResp, function (err, resp) {
            makeARequest(302, loggedRequest, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.headers.location.match(/flow=login/));

                loggedRequest.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(!!resp.text.match(/You must log out to see this page/));

                    done();
                });
            });
        });
    });

    it('displays recover password form', function (done) {
        makeARequest(200, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            isValidRecoverPasswordPage('', resp.text);

            assert.ok(!!resp.text.match(/Reset my password/));

            done();
        });
    });
});