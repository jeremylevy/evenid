var assert = require('assert');

var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var IsSelect = require('../../../../testUtils/validators/isSelect');

var request = null;

var loggedRequest = null;
var csrfToken = null;

var loggedCsrfToken = null;
var user = null;

var makeARequest = null;

var validSignupForm = function (csrfToken) {
    return {
        email: mongoose.Types.ObjectId().toString() + '@evenid.com',
        password: 'azerty',
        _csrf: csrfToken
    };
};

var isSuccessfulResp = function (request, done) {
    return function (err, resp) {
        var redirectReg = new RegExp('/users/' + config.EVENID_MONGODB.OBJECT_ID_PATTERN);
        
        if (err) {
            return done(err);
        }

        assert.ok(!!resp.headers.location.match(redirectReg));

        request.get(resp.headers.location).expect(200, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/You are now registered on EvenID\./));

            done(null, resp);
        });
    };
};

describe('POST /register', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            loggedRequest = resp.request;
            loggedCsrfToken = resp.csrfToken;
            user = resp.user;

            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;
                csrfToken = resp.csrfToken;

                makeARequest = function (data, statusCode, request, cb) {
                    request
                        .post('/register')
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
    });

    it('redirects to user page when user is logged', function (done) {
        makeARequest({_csrf: loggedCsrfToken}, 302, loggedRequest, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/users/' + user.id);

            done();
        });
    });

    it('displays errors when empty form data', function (done) {
        makeARequest({_csrf: csrfToken}, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/register');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }
                
                isInvalidRequestResponse(resp.text);
                assert.ok(!!resp.text.match(/Email must be set/));
                assert.ok(!!resp.text.match(/Your password must be at least [0-9]+ characters/));

                done();
            });
        });
    });

    it('displays errors when email is invalid', function (done) {
        var form = validSignupForm(csrfToken);

        form.email = 'bar';

        makeARequest(form, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/register');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);
                assert.ok(!!resp.text.match(/Email is invalid/));

                done();
            });
        });
    });

    it('displays errors when password is invalid', function (done) {
        var form = validSignupForm(csrfToken);

        form.password = 'bar';

        makeARequest(form, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/register');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);
                assert.ok(!!resp.text.match(/Your password must be at least [0-9]+ characters/));

                done();
            });
        });
    });

    it('displays errors when email is already used', function (done) {
        var form = validSignupForm(csrfToken);

        form.email = user.email;

        makeARequest(form, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/register');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                isInvalidRequestResponse(resp.text);
                assert.ok(!!resp.text.match(/This email is already used/));

                done();
            });
        });
    });

    it('redirects to user page and displays successful '
       + 'notification when valid form data', function (done) {
        
        makeARequest(validSignupForm(csrfToken), 302, request, isSuccessfulResp(request, done));
    });

    it('redirects to user page and displays successful '
       + 'notification when valid form data and timezone', function (done) {
        
        // Global request object was
        // logged by previous test
        getUnloggedRequest(function (err, resp) {
            var formData = {};
            
            if (err) {
                return done(err);
            }

            formData = validSignupForm(resp.csrfToken);

            formData.timezone = 'Europe/Paris';

            makeARequest(formData, 302, resp.request, isSuccessfulResp(resp.request, function (err, resp) {
                var isSelect = IsSelect(resp.text);
                var selected = true;

                if (err) {
                    return done(err);
                }

                isSelect('timezone', formData.timezone, selected);

                done();
            }));
        });
    });

    it('redirects to user page and displays successful '
       + 'notification when valid form data and invalid timezone', function (done) {
        
        // Global request object was
        // logged by previous tests
        getUnloggedRequest(function (err, resp) {
            var formData = {};
            
            if (err) {
                return done(err);
            }

            formData = validSignupForm(resp.csrfToken);

            formData.timezone = 'bar';

            makeARequest(formData, 302, resp.request, isSuccessfulResp(resp.request, function (err, resp) {
                var isSelect = IsSelect(resp.text);
                var selected = false;

                if (err) {
                    return done(err);
                }

                isSelect('timezone', '', selected);

                done();
            }));
        });
    });
});