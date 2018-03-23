var assert = require('assert');

var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

var validUploadHash = '21390347d6f5a6632632e70c247bb6873561053b';

describe('POST /clients/:client_id/logos', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, data, statusCode, request, cb) {
                request
                    .post('/clients/' + clientID + '/logos')
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
        var clientID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, {
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
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

    it('returns HTTP status code 400 when invalid logo url', function (done) {
        createClient(csrfToken, request, function (err, client) {
            var url = 'bar';

            if (err) {
                return done(err);
            }

            makeARequest(client.id, {
                url: url,
                _csrf: csrfToken
            }, 400, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                done();
            });
        });
    });

    it('returns HTTP status code 200 when valid logo url', function (done) {
        createClient(csrfToken, request, function (err, client) {
            var url = 'https://evenid.s3.amazonaws.com'
                    + '/clients/logos/' 
                    + validUploadHash;

            if (err) {
                return done(err);
            }

            makeARequest(client.id, {
                url: url,
                _csrf: csrfToken
            }, 200, request, function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(new RegExp(validUploadHash)));

                done();
            });
        });
    });
});