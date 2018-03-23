var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var moment = require('moment-timezone');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');

var getOauthTestAccount = require('../../../../testUtils/tests/getOauthTestAccount');
var convertOauthTestAccount = require('../../../../testUtils/tests/convertOauthTestAccount');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /clients/:client_id/statistics/test-accounts/for-period', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, period, statusCode, request, cb) {
                var URL = '/clients/' 
                            + clientID 
                            + '/statistics/test-accounts/for-period';

                if (period) {
                    URL += '?period=' + period;
                }

                request
                    .get(URL)
                    // Used through Ajax
                    .set('X-Requested-With', 'XMLHttpRequest')
                    .expect('Content-Type', 'application/json; charset=utf-8')
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

    it('returns JSON object with errors '
       + 'when user is unlogged', function (done) {
        
        // We don't need to create user because 
        // redirect to login page occurs before the deletion
        var userID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, '1 day', 403, request, function (err, resp) {
                var error = resp && resp.body;

                if (err) {
                    return done(err);
                }

                assert.doesNotThrow(function () {
                    JSON.parse(resp.text);
                });

                assert.strictEqual(error.type, 'access_denied');
                assert.strictEqual(error.messages.main, 'You are not authorized to access this resource.');

                done();
            });
        });
    });

    it('returns JSON object with errors '
       + 'when invalid client ID', function (done) {
        
        var clientID = mongoose.Types.ObjectId().toString();

        makeARequest(clientID, '1 day', 403, request, function (err, resp) {
            var error = resp && resp.body;
            
            if (err) {
                return done(err);
            }

            assert.doesNotThrow(function () {
                JSON.parse(resp.text);
            });

            assert.strictEqual(error.type, 'access_denied');
            assert.strictEqual(error.messages.main, 'You are not authorized to access this resource.');

            done();
        });
    });

    it('returns JSON object with errors '
       + 'when invalid period parameter', function (done) {

        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            makeARequest(resp.client.id, 'bar', 400, resp.request, function (err, resp) {
                var error = resp && resp.body;
                
                if (err) {
                    return done(err);
                }

                assert.doesNotThrow(function () {
                    JSON.parse(resp.text);
                });

                assert.strictEqual(error.type, 'invalid_request');
                assert.strictEqual(error.messages.period, 'period parameter is invalid.');

                done();
            });
        });
    });

    it('returns statistics as JSON when valid client ID', function (done) {
        async.auto({
            beforeHook: function (cb) {
                oauthAuthorizeBeforeHook(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            // User use test account for the first time
            getOauthTestAccount: ['beforeHook', function (cb, results) {
                var resp = results.beforeHook;

                getOauthTestAccount(resp, function (err, testAccount) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, testAccount);
                });
            }],

            // Converted user
            convertOauthTestAccount: ['getOauthTestAccount', function (cb, results) {
                var resp = results.beforeHook;
                var testAccount = results.getOauthTestAccount;

                convertOauthTestAccount(resp, testAccount.id, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            var resp = results && results.beforeHook;
            var clientID = resp && resp.client.id;

            var testPeriod = function (periodNb, period, done) {
                makeARequest(clientID, periodNb + ' ' + period, 
                             200, resp.request, function (err, resp) {
                    
                    var categories = [];
                    var data = [];

                    var dateFormat = 'dddd';
                    var specialDays = 2;

                    if (err) {
                        return done(err);
                    }

                    if (period === 'months') {
                        dateFormat = 'MMMM';
                        specialDays = 1;
                    } else if (period === 'years') {
                        dateFormat = 'YYYY';
                        specialDays = 1;
                    }

                    for (var i = periodNb, j = specialDays; i >= j; --i) {
                        categories.push(moment.tz(new Date(), 'UTC')
                                              .subtract(i, period)
                                              .format(dateFormat));
                    }

                    if (period === 'days') {
                        categories.push('Yesterday');
                        categories.push('Today');
                    } else if (period === 'months') {
                        categories.push('This month');
                    } else {
                        categories.push('This year');
                    }

                    for (var i = 0; i < periodNb; ++i) {
                        data.push(0);
                    }

                    data.push(1);

                    assert.deepEqual(resp.body, {
                        xAxis: {
                            categories: categories
                        },

                        series: [
                            {
                                name: 'Registration(s)',
                                color: '#7cb5ec',
                                data: data
                            },

                            {
                                name: 'Conversion Rate',
                                color: '#90ed7d',
                                data: data
                            }
                        ]
                    });

                    done();
                });
            };

            if (err) {
                return done(err);
            }

            testPeriod(6, 'days', function (err) {
                if (err) {
                    return done(err);
                }

                testPeriod(11, 'months', function (err) {
                    if (err) {
                        return done(err);
                    }

                    testPeriod(6, 'years', function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
                });
            });
        });
    });
});