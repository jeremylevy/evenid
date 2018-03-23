var assert = require('assert');

var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var validClient = require('../../../../testUtils/data/validClient');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('GET /clients', function () {
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
                    .get('/clients')
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

    it('displays client creation page', function (done) {
        makeARequest(200, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            // Make sure client form is displayed in page
            Object.keys(validClient(csrfToken)).forEach(function (clientKey) {
                assert.ok(!!resp.text.match(new RegExp('name="' + clientKey + '"')));
            });
            
            done();
        });
    });
});