var querystring = require('querystring');

var assert = require('assert');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');

var getOauthTestAccount = require('../../../../testUtils/tests/getOauthTestAccount');

var isOauthTestAccountFormDisplayed = require('../../../../testUtils/validators/isOauthTestAccountFormDisplayed');
var IsInput = require('../../../../testUtils/validators/isInput');

var beforeHookResp = null;
var request = null;
var client = null;
var redirectionURI = null;

var makeARequest = null;

describe('GET /oauth/authorize (Unlogged user)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            beforeHookResp = resp;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;

                makeARequest = function (flow, cb) {
                    var context = this;
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
                        .expect(200, function (err, res) {
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

    it('displays login form during login '
       + 'flow when user is unlogged', function (done) {
        
        makeARequest('login', function (err, resp) {
            var isInput = null;
            
            if (err) {
                return done(err);
            }

            isInput = IsInput(resp.text);

            isInput('email', 'email', '');
            isInput('password', 'password', '');
            isInput('checkbox', 'persistent_login', '', 'checked');

            assert.ok(!!resp.text.match(/Register/));

            done();
        });
    });

    it('displays registration form during registration '
       + 'flow when user is unlogged', function (done) {
        
        makeARequest('registration', function (err, resp) {
            var isInput = null;
            
            if (err) {
                return done(err);
            }

            isInput = IsInput(resp.text);

            isInput('email', 'email', '');
            isInput('password', 'password', '');
            isInput('checkbox', 'persistent_login', '', 'checked');
            
            /* Make sure timezone was 
               not prefilled during 
               oauth authorize flow */
            
            assert.throws(function () {
                isInput('hidden', 'timezone', '');
            }, assert.AssertionError);
            
            assert.ok(!resp.text.match(/Intl\.DateTimeFormat\(\)\.resolved\.timeZone/));

            /* END */

            assert.ok(!!resp.text.match(/Next/));

            done();
        });
    });

    it('displays test button and prefill test account field '
       + 'when oauth client authorize test accounts and user '
       + 'has already tested an app '
       + 'during registration flow', function (done) {

        getOauthTestAccount(beforeHookResp, function (err, testAccount) {
            if (err) {
                return done(err);
            }

            request.saveCookies(testAccount.resp);

            makeARequest('registration', function (err, resp) {
                if (err) {
                    return done(err);
                }

                // `true`: displayed?
                isOauthTestAccountFormDisplayed(testAccount, resp, true);

                done();
            });
        });
    });

    it('doesn\'t display test button '
       + 'when oauth client authorize test accounts during login flow ', function (done) {

        getOauthTestAccount(beforeHookResp, function (err, testAccount) {
            if (err) {
                return done(err);
            }

            request.saveCookies(testAccount.resp);

            makeARequest('login', function (err, resp) {
                if (err) {
                    return done(err);
                }

                // `false`: displayed?
                isOauthTestAccountFormDisplayed(testAccount, resp, false);

                done();
            });
        });
    });
});