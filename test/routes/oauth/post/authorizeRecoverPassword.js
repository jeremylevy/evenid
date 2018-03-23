var assert = require('assert');

var querystring = require('querystring');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');

var createRecoverPasswordRequest = require('../../../../testUtils/users/createRecoverPasswordRequest');

var beforeHookResp = null;
var loggedRequest = null;
var request = null;
var loggedRequestCsrfToken = null;
var csrfToken = null;
var user = null;
var client = null;
var redirectionURI = null;

var makeARequest = null;

describe('POST /oauth/authorize (Recover password)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            beforeHookResp = resp;
            loggedRequest = resp.request;
            loggedRequestCsrfToken = resp.csrfToken;
            user = resp.user;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;
                csrfToken = resp.csrfToken;

                makeARequest = function (data, statusCode, request, cb) {
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
    });
    
    it('displays registration form when user '
       + 'is logged and has not authorized client', function (done) {
        
        makeARequest({
            _csrf: loggedRequestCsrfToken
        }, 302, loggedRequest, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(/flow=registration/));

            loggedRequest.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                assert.ok(!!resp.text.match(/You must log out to see this page/));

                done();
            });
        });
    });

    it('displays error when email is invalid', function (done) {
        makeARequest({
            email: 'bar',
            _csrf: csrfToken
        }, 302, request, function (err, resp) {

            var uriReg = new RegExp('/oauth/authorize');

            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(uriReg));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                assert.ok(!!resp.text.match(/Your email address is invalid/));

                done();
            });
        });
    });

    it('displays error when email is '
       + 'not attached to an account', function (done) {
        
        var email = 'bar' + mongoose.Types.ObjectId().toString() + '@evenid.com';

        makeARequest({
            email: email,
            _csrf: csrfToken
        }, 302, request, function (err, resp) {

            var uriReg = new RegExp('/oauth/authorize');
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(uriReg));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }
                
                assert.ok(!!resp.text.match(/Your email address does not belong to any account/));

                done();
            });
        });
    });

    it('displays successful notification when valid email', function (done) {
        makeARequest({
            email: user.email,
            _csrf: csrfToken
        }, 302, request, function (err, resp) {
            var uriReg = new RegExp('/oauth/authorize');

            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(uriReg));

            request.get(resp.headers.location).end(function (err, resp) {
                var notifReg = new RegExp('An email containing a link to reset '
                                        + 'your password has just been sent '
                                        + 'to the address you provided.');

                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(notifReg));

                done();
            });
        });
    });
});