var assert = require('assert');
var async = require('async');

var oauthAuthorizeBeforeHook = require('./oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('./authorizeOauthClientForUser');

module.exports = function (makeARequest) {
    var context = this;
    var entity = context && context.entity;
    var formData = context && context.formData;
    var request = context && context.request;
    var csrfToken = context && context.csrfToken;
    var user = context && context.user;

    return function (done) {
        var createOauthClient = function (cb) {
            oauthAuthorizeBeforeHook(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                cb(null, resp);
            });
        };

        var _authorizeOauthClientForUser = function (resp, resp2, cb) {
            var validFormData = (resp2 || resp).validFormData;

            if (resp2) {
                Object.keys(resp2).forEach(function (key) {
                    if (['client', 'redirectionURI'].indexOf(key) !== -1) {
                        return;
                    }

                    resp2[key] = resp[key];
                });
            }

            if (formData) {
                (resp2 || resp).validFormData = function () {
                    var data = validFormData();

                    Object.keys(formData).forEach(function (key) {
                        data[key] = formData[key];
                    });

                    return data;
                };
            }

            if (request) {
                (resp2 || resp).request = request;
                (resp2 || resp).csrfToken = csrfToken;
                (resp2 || resp).user = user;
            }

            authorizeOauthClientForUser(resp2 || resp, function (err, resp) {
                if (err) {
                    return cb(err);
                }

                cb(null, resp);
            });
        };

        var displayUser = function (usedByReg, results, cb) {
            var createOauthClientResp = results.createOauthClient;
            var request = createOauthClientResp.request;
            var user = createOauthClientResp.user;
            // Landline and mobile so 2
            var usedByNb = entity === 'phone_numbers'
                            ? 2 
                            : entity 
                                ? 1 
                                : createOauthClientResp.userFields.length;
            var args = [user.id, 200, request, function (err, resp) {
                if (err) {
                    return cb(err);
                }
                
                assert.strictEqual(resp.text.match(usedByReg).length, usedByNb);

                cb(null, resp);
            }];

            // Insert entity ID
            if (['email', 'phone_number', 'address'].indexOf(entity) !== -1) {
                args.splice(1, 0, 
                            formData.email 
                            || formData.mobile_phone_number 
                            || formData.shipping_address);
            }

            // Insert page
            if (['emails', 'addresses'].indexOf(entity) !== -1) {
                args.splice(1, 0, null);
            } 

            makeARequest.apply(this, args);
        };

        async.auto({
            createOauthClient: createOauthClient,
            createOauthClient2: ['createOauthClient', createOauthClient],
            createOauthClient3: ['createOauthClient2', createOauthClient],

            authorizeOauthClientForUser: ['createOauthClient', function (cb, results) {
                var createOauthClientResp = results.createOauthClient;

                _authorizeOauthClientForUser(createOauthClientResp, null, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            displayUserForOneClient: ['authorizeOauthClientForUser', function (cb, results) {
                var createOauthClientResp = results.createOauthClient;
                var usedByReg = new RegExp('Used by <a[^>]+>' 
                                           + createOauthClientResp.client.client_name,
                                           'g');

                if (['addresses', 'address'].indexOf(entity) !== -1) {
                    usedByReg = new RegExp('Accessible from <a[^>]+>'
                                           + createOauthClientResp.client.client_name,
                                           'g');
                }

                displayUser(usedByReg, results, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            authorizeOauthClientForUser2: ['createOauthClient2', 'displayUserForOneClient', 
                                           function (cb, results) {

                var createOauthClientResp = results.createOauthClient;
                var createOauthClient2Resp = results.createOauthClient2;

                _authorizeOauthClientForUser(createOauthClientResp, 
                                             createOauthClient2Resp, 
                                             function (err, resp) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            displayUserForTwoClient: ['authorizeOauthClientForUser2', function (cb, results) {
                var usedByReg = new RegExp('Used by <a[^>]+>[^<]+</a> and <a[^>]+>[^<]+</a>',
                                           'g');

                if (['addresses', 'address'].indexOf(entity) !== -1) {
                    usedByReg = new RegExp('Accessible from <a[^>]+>[^<]+</a> and <a[^>]+>[^<]+</a>',
                                           'g');
                }

                displayUser(usedByReg, results, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            authorizeOauthClientForUser3: ['createOauthClient3', 'displayUserForTwoClient', 
                                           function (cb, results) {
                
                var createOauthClientResp = results.createOauthClient;
                var createOauthClient3Resp = results.createOauthClient3;

                _authorizeOauthClientForUser(createOauthClientResp, 
                                             createOauthClient3Resp, 
                                             function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            displayUserForThreeClient: ['authorizeOauthClientForUser3', function (cb, results) {
                var usedByReg = new RegExp('Used by (<a[^>]+>[^<]+</a>,?\\s?){2} and <a[^>]+>1</a> other',
                                           'g');

                if (['addresses', 'address'].indexOf(entity) !== -1) {
                    usedByReg = new RegExp('Accessible from (<a[^>]+>[^<]+</a>,?\\s?){2} and <a[^>]+>1</a> other',
                                           'g');
                }

                displayUser(usedByReg, results, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            if (err) {
                return done(err);
            }

            done();
        });
    };
};