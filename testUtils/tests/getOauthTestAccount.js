var querystring = require('querystring');
var async = require('async');

var config = require('../../config');

var getUnloggedRequest = require('../getUnloggedRequest');

var updateOauthClient = require('../clients/update');

module.exports = function (beforeHookResp, cb) {
    var unloggedRequest = null;
    var request = beforeHookResp.request;
    var unloggedCsrfToken = null;
    var csrfToken = beforeHookResp.csrfToken;
    var client = beforeHookResp.client;
    var redirectionURI = beforeHookResp.redirectionURI;

    async.auto({
        // Make sure oauth client allow test accounts
        updateOauthClient: function (cb) {
            updateOauthClient(csrfToken, client.id, {
                authorize_test_accounts: 'true'
            }, request, function (err, updatedClient) {
                
                if (err) {
                    return cb(err);
                }

                cb(null, updatedClient);
            });
        },

        // To get a test account 
        // we must use testing
        // during unlogged request 
        // otherwise logged user id
        // will be used
        getUnloggedRequest: function (cb) {
            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                unloggedRequest = resp.request;
                unloggedCsrfToken = resp.csrfToken;

                cb(null, resp);
            });
        },

        // Create test account by using 
        // testing for the first time
        // during unlogged request
        createTestAccount: ['updateOauthClient', 'getUnloggedRequest', function (cb, results) {
            var query = null;

            query = {
                client_id: client.client_id.toString(),
                redirect_uri: redirectionURI.redirect_uri,
                state: 'foo',
                flow: 'registration'
            };

            unloggedRequest
                .post('/oauth/authorize?' + querystring.stringify(query))
                // Body parser middleware need it in order to populate req.body
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send({
                    use_test_account: 'true',
                    _csrf: unloggedCsrfToken
                })
                .end(function (err, resp) {
                    // Signed cookie: test_account_CLIENT_ID=s%3ATEST_ACCOUNT_ID.SIGNATURE
                    var testAccountCookieReg = new RegExp('test_account_' + client.id + '=s%3A(' 
                                                          + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                                                          + ')[^;]+');
                    var testAccountCookieMatches = null;
                    var testAccount = {};
                    
                    if (err) {
                        return cb(err);
                    }
                    
                    testAccountCookieMatches = resp.headers['set-cookie'][0].match(testAccountCookieReg);
                    testAccount.id = testAccountCookieMatches[1];
                    testAccount.cookie = testAccountCookieMatches[0];
                    testAccount.resp = resp;

                    cb(null, testAccount);
                });
        }]
    }, function (err, results) {
        var testAccount = results && results.createTestAccount;

        if (err) {
            return cb(err);
        }

        cb(null, testAccount);
    });
};