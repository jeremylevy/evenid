var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var moment = require('moment-timezone');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /clients/:client_id/statistics/events/for-period', function () {
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
                            + '/statistics/events/for-period';

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
        // Events are not inserted 
        // for client owner so we will need 
        // to create another user
        var clientOwner = {
            request: null,
            user: null,
            csrfToken: null
        };

        async.auto({
            beforeHook: function (cb) {
                oauthAuthorizeBeforeHook(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            // Events are not inserted for client owner
            // so create another user
            getLoggedRequest: ['beforeHook', function (cb, results) {
                var beforeHookResp = results.beforeHook;

                getLoggedRequest(function (err, resp) {
                    if (err) {
                        return cb(error);
                    }

                    clientOwner.request = beforeHookResp.request;
                    clientOwner.user = beforeHookResp.user;
                    clientOwner.csrfToken = beforeHookResp.csrfToken;

                    beforeHookResp.request = resp.request;
                    beforeHookResp.user = resp.user;
                    beforeHookResp.csrfToken = resp.csrfToken;

                    cb(null);
                });
            }],

            // Registration event
            registerUser: ['getLoggedRequest', function (cb, results) {
                var resp = results.beforeHook;

                authorizeOauthClientForUser(resp, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            // Login event
            logUser: ['registerUser', function (cb, results) {
                var resp = results.beforeHook;

                authorizeOauthClientForUser.call({
                    flow: 'login'
                }, resp, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            }],

            // Unregistration event
            unsubscribeUser: ['logUser', function (cb, results) {
                var resp = results.beforeHook;

                var request = resp.request;
                var csrfToken = resp.csrfToken;

                var userID = resp.user.id;
                var clientID = resp.client.id;

                request
                    .delete('/users/' + userID 
                            + '/authorized-clients/' 
                            + clientID)
                    // Body parser middleware need it 
                    // in order to populate req.body
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .send({
                        _csrf: csrfToken
                    })
                    .end(function (err, resp) {
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
                             200, clientOwner.request, function (err, resp) {
                    
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
                                name: 'Login(s)',
                                color: '#90ed7d',
                                data: data
                            }, 

                            {
                                name: 'Deregistration(s)',
                                color: '#f35958',
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