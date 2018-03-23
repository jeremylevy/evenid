var assert = require('assert');

var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var validUser = require('../../../../testUtils/data/validUser');

var isValidUserPage = require('../../../../testUtils/validators/isValidUserPage');
var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('PUT /users/:user_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, data, statusCode, request, cb) {
                request
                    .put('/users/' + userID)
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .send(data)
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
        var userID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, validUser(csrfToken), 
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/login');

                request.get('/login')
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    assert.ok(!!resp.text.match(/You must log in to see this page/));

                    done();
                });
            });
        });
    });

    it('displays errors when invalid form data', function (done) {
        var userData = {
            // '+2': for first and last elements
            first_name: new Array(config.EVENID_USERS.MAX_LENGTHS.FIRST_NAME + 2).join('a'),
            last_name: new Array(config.EVENID_USERS.MAX_LENGTHS.LAST_NAME + 2).join('a'),
            nickname: new Array(config.EVENID_USERS.MAX_LENGTHS.NICKNAME + 2).join('a'),
            gender: 'bar',
            date_of_birth_month: 'bar',
            date_of_birth_day: 'bar',
            date_of_birth_year: 'bar',
            place_of_birth: 'bar',
            nationality: 'bar',
            timezone: 'bar',
            _csrf: csrfToken
        };

        makeARequest(user.id, userData, 302, 
                     request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location,
                               '/users/' + user.id);

            request.get('/users/' + user.id)
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);

                assert.ok(!!resp.text.match(/First name is too long/));
                
                assert.ok(!!resp.text.match(/Last name is too long/));
                assert.ok(!!resp.text.match(/Nickname is too long/));
                
                assert.ok(!!resp.text.match(/Gender is invalid/));
                assert.ok(!!resp.text.match(/Date of birth is invalid/));
                
                assert.ok(!!resp.text.match(/Place of birth is invalid/));
                assert.ok(!!resp.text.match(/Nationality is invalid/));

                assert.ok(!!resp.text.match(/Timezone is invalid/));

                done();
            });
        });
    });

    it('displays errors when nickname is already used', function (done) {
        var userData = validUser(csrfToken);

        makeARequest(user.id, userData, 302, 
                     request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            // Get another user
            // If previous user update nickname 
            // with the same nickname (their current nickname)
            // unique index error will not be triggered
            getLoggedRequest(function (err, resp) {
                var formData = null;
                var request = resp.request
                var user = resp.user;
                var csrfToken = resp.csrfToken;

                if (err) {
                    return done(err);
                }

                // Try to update nickname 
                // with previous user nickname
                formData = {
                    nickname: userData.nickname,
                    _csrf: csrfToken
                };

                makeARequest(user.id, formData, 302, 
                             request, function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    assert.strictEqual(resp.headers.location,
                                       '/users/' + user.id);

                    request.get('/users/' + user.id)
                           .end(function (err, resp) {
                        
                        if (err) {
                            return done(err);
                        }

                        isInvalidRequestResponse(resp.text);

                        assert.ok(!!resp.text.match(/This nickname is already used/));

                        done();
                    });
                });
            });
        });
    });

    it('displays errors when oauth client wants '
       + 'fields and user try to remove it', function (done) {
        
        oauthAuthorizeBeforeHook(function (err, beforeHookResp) {
            var request = beforeHookResp && beforeHookResp.request;
            var csrfToken = beforeHookResp && beforeHookResp.csrfToken;
            var user = beforeHookResp && beforeHookResp.user;

            if (err) {
                return done(err);
            }

            authorizeOauthClientForUser(beforeHookResp, function (err, resp) {
                var userData = validUser(csrfToken);

                if (err) {
                    return done(err);
                }

                Object.keys(userData).forEach(function (userField) {
                    if (userField === '_csrf') {
                        return;
                    }

                    userData[userField] = '';
                });

                makeARequest(user.id, userData, 302, 
                             request, function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    assert.strictEqual(resp.headers.location,
                                       '/users/' + user.id);

                    request.get('/users/' + user.id)
                           .end(function (err, resp) {
                        
                        var matches = resp && resp.text.match(/must be set/g);
                        
                        if (err) {
                            return done(err);
                        }

                        isInvalidRequestResponse(resp.text);

                        // Why '-3'?
                        // `date_of_birth_month`, `date_of_birth_day`, `date_of_birth_year` 
                        // => `date_of_birth` 
                        // =>  -2
                        // `_csrf` => -2
                        assert.strictEqual(Object.keys(userData).length - 3,
                                           matches.length);

                        done();
                    });
                });
            });
        });
    });

    it('redirects to user page when valid form data', function (done) {
        var userData = validUser(csrfToken);

        makeARequest(user.id, userData, 302, 
                     request, function (err, resp) {
            
            var redirectReg = new RegExp('/users/' + user.id);
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(redirectReg));

            request.get(resp.headers.location)
                   .end(function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                /* Make sure user form is filled */
                isValidUserPage(userData, resp.text);

                done();
            });
        });
    });
});