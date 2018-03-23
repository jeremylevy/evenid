var assert = require('assert');

var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var updateUser = require('../../../../testUtils/users/update');

var isValidUserPage = require('../../../../testUtils/validators/isValidUserPage');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

// During Oauth authorize, upload form is displayed in iframe
// because embedding form in form is not allowed in HTML5
describe('GET /oauth/authorize/profil-photo', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (statusCode, request, cb) {
                request
                    .get('/oauth/authorize/profil-photo')
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
        getUnloggedRequest(function (err, resp) {
            var request = resp.request;

            if (err) {
                return done(err);
            }

            makeARequest(302, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.strictEqual('/login', resp.headers.location);

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

    it('displays upload form', function (done) {
        makeARequest(200, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(/file-upload-form/));

            done();
        });
    });
});