var assert = require('assert');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var IsInput = require('../../../../testUtils/validators/isInput');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

// Make sure user was unlogged
// by asserting than login form could be displayed
var assertUserIsUnlogged = function (IsInput, request, cb) {
    request.get('/login').end(function (err, resp) {
        var isInput = IsInput(resp.text);

        if (err) {
            return cb(err);
        }

        isInput('email', 'email', '');
        isInput('password', 'password', '');

        cb();
    });
};

describe('POST /logout', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (data, statusCode, request, cb) {
                request
                    .post('/logout')
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

    it('redirects to login page with error when user is unlogged', function (done) {
        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest({
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    assert.ok(!!resp.text.match(/You must log in to see this page\./));

                    done();
                });
            });
        });
    });

    it('redirects to user profil with error when invalid csrf', function (done) {
        makeARequest({
            _csrf: 'TEST_INVALID_VALUE'
        }, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/user-redirect');

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/users/' + user.id);

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }
                    assert.ok(!!resp.text.match(/An unknown error has occurred\. Please try again\./));

                    done();
                });
            });
        });
    });

    it('logout user and redirects to login page when user is logged', function (done) {
        makeARequest({
            _csrf: csrfToken
        }, 302, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/login');

            assertUserIsUnlogged(IsInput, request, done);
        });
    });

    it('logout user and redirects to whitelisted page when user is logged', function (done) {
        // User was unlogged by previous tests so
        // create another logged request
        getLoggedRequest(function (err, resp) {
            var request = resp && resp.request;
            var csrfToken = resp && resp.csrfToken;
            var redirectToURL = '/oauth/authorize?client_id=bar';

            if (err) {
                return done(err);
            }

            makeARequest({
                redirect_to: redirectToURL,
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, redirectToURL);

                assertUserIsUnlogged(IsInput, request, done);
            });
        });
    });

    it('logout user and redirects to login page when user is logged '
       + 'and malicious `redirect_to` parameter was passed', function (done) {
        
        // User was unlogged by previous tests so
        // create another logged request
        getLoggedRequest(function (err, resp) {
            var request = resp && resp.request;
            var csrfToken = resp && resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest({
                redirect_to: '/malicious-url',
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

                assertUserIsUnlogged(IsInput, request, done);
            });
        });
    });
});