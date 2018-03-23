var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createEmail = require('../../../../testUtils/users/createEmail');

var validEmail = require('../../../../testUtils/data/validEmail');

var isValidUserEmailPage = require('../../../../testUtils/validators/isValidUserEmailPage');
var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('PUT /users/:user_id/emails/:email_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, emailID, data,
                                     statusCode, request, cb) {
                
                request
                    .put('/users/' + userID 
                         + '/emails/' + emailID)
                    // Body parser middleware need it in order to populate req.body
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
        // We don't need to create user because redirect to login page
        // occurs before the deletion
        var userID = mongoose.Types.ObjectId().toString();
        var emailID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, emailID, {
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

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

    it('displays errors when empty form data', function (done) {
        createEmail(csrfToken, user.id, user.password,
                    request, function (err, email) {
            
            if (err) {
                return done(err);
            }

            makeARequest(user.id, email.id, {
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/users/' + user.id 
                                   + '/emails/' + email.id);

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);
                    
                    assert.ok(!!resp.text.match(/Email must be set/));

                    done();
                });
            });
        });
    });

    it('displays errors when invalid address length', function (done) {
        createEmail(csrfToken, user.id, user.password,
                    request, function (err, email) {
            
            if (err) {
                return done(err);
            }

            email.email = 'bar@' 
                        + new Array(config.EVENID_EMAILS
                                          .MAX_LENGTHS
                                          .ADDRESS).join('a')
                        + '.com';

            makeARequest(user.id, email.id, email,
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/users/' + user.id 
                                   + '/emails/' + email.id);

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);
                    
                    assert.ok(!!resp.text.match(/Email is too long/));

                    done();
                });
            });
        });
    });

    it('displays errors when invalid email', function (done) {
        createEmail(csrfToken, user.id, user.password,
                    request, function (err, email) {
            
            if (err) {
                return done(err);
            }

            email.email = 'bar';

            makeARequest(user.id, email.id, email,
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/users/' + user.id 
                                   + '/emails/' + email.id);

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);
                    
                    assert.ok(!!resp.text.match(/Email is invalid/));

                    done();
                });
            });
        });
    });

    it('displays errors when email is already used', function (done) {
        createEmail(csrfToken, user.id, user.password,
                    request, function (err, email) {
            
            if (err) {
                return done(err);
            }

            createEmail(csrfToken, user.id, user.password, 
                        request, function (err, email2) {

                makeARequest(user.id, email2.id, email, 
                             302, request, function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    assert.strictEqual(resp.headers.location,
                                       '/users/' + user.id 
                                       + '/emails/' + email2.id);

                    request.get(resp.headers.location)
                           .end(function (err, resp) {
                        
                        if (err) {
                            return done(err);
                        }

                        isInvalidRequestResponse(resp.text);
                        
                        assert.ok(!!resp.text.match(/This email is already used/));

                        done();
                    });
                });
            });
        });
    });

    it('redirects to user\'s email page when valid form data', function (done) {
        createEmail(csrfToken, user.id, user.password, 
                    request, function (err, email) {
            
            if (err) {
                return done(err);
            }

            makeARequest(user.id, email.id, email,
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/users/' + user.id 
                                   + '/emails/' + email.id);

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isValidUserEmailPage(email, resp.text);

                    done();
                });
            });
        });
    });
});