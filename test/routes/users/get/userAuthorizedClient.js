var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');
var libphonenumber = require('node-phonenumber');
var moment = require('moment');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /users/:user_id/authorized-clients/:authorized_client_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, authorizedOauthClientID, statusCode, request, cb) {
                request
                    .get('/users/' + userID + '/authorized-clients/' + authorizedOauthClientID)
                    .expect(statusCode, function (err, resp) {
                        if (err) {
                            return cb(err);
                        }

                        cb(null, resp);
                    });
            };

            done();
        });
    });

    it('redirects to login page when user is unlogged', function (done) {
        // We don't need to create user because redirect to login page
        // occurs before get
        var userID = mongoose.Types.ObjectId().toString();
        var authorizedOauthClientID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, authorizedOauthClientID, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

                request.get('/login').end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }
                    
                    assert.ok(!!resp.text.match(/You must log in to see this page/));

                    done();
                });
            });
        });
    });

    it('displays error when invalid user ID and oauth client ID', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var authorizedOauthClientID = mongoose.Types.ObjectId().toString();

        makeARequest(userID, authorizedOauthClientID, 403, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

            done();
        });
    });

    it('displays oauth client when valid user ID and valid oauth client ID', function (done) {
        async.auto({
            createOauthClient: function (cb) {
                oauthAuthorizeBeforeHook(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            authorizeOauthClientForUser: ['createOauthClient', function (cb, results) {
                var resp = results.createOauthClient;

                authorizeOauthClientForUser(resp, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            getAuthorizedOauthClient : ['authorizeOauthClientForUser', function (cb, results) {
                var resp = results.createOauthClient;
                var user = results.authorizeOauthClientForUser.formData;

                makeARequest(resp.user.id, resp.client.id, 200, resp.request, function (err, resp) {
                    var phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
                    var dateOfBirth = null;

                    if (err) {
                        return cb(err);
                    }

                    Object.keys(user).forEach(function (userKey) {
                        var userValue = user[userKey];

                        if (['email', 'first_name', 'last_name', 
                             'nickname', 'date_of_birth', 'gender', 
                             'place_of_birth', 'nationality',
                             'timezone', 
                             'shipping_address_address_line_1',
                             'billing_address_address_line_1',
                             'landline_phone_number_number',
                             'mobile_phone_number_number'].indexOf(userKey) === -1) {

                            return;
                        }

                        if (['landline_phone_number_number', 
                             'mobile_phone_number_number'].indexOf(userKey) !== -1) {

                            userValue = phoneUtil.parse(userValue, user[userKey.replace(/number$/, 'country')]);
                            userValue = phoneUtil.format(userValue, libphonenumber.PhoneNumberFormat.NATIONAL);
                        }

                        if ('date_of_birth' === userKey) {
                            dateOfBirth = moment([user.date_of_birth_year, 
                                                  user.date_of_birth_month, 
                                                  user.date_of_birth_day].join('-'));

                            dateOfBirth.locale('en-us');
                    
                            userValue = dateOfBirth.format('LL'); 
                        }

                        if ('place_of_birth' === userKey) {
                            userValue = 'France';
                        }

                        if ('nationality' === userKey) {
                            userValue = 'French';
                        }

                        if ('timezone' === userKey) {
                            userValue = 'Paris';
                        }
                        
                        assert.ok(!!resp.text.match(new RegExp(userValue)));
                    });

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            if (err) {
                return done(err);
            }

            done();
        });
    });
});