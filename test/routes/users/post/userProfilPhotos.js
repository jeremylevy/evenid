var assert = require('assert');

var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

var uploadHash = 'e728e943be4348801619afcaeaa507007ee6bd61';

describe('POST /users/:user_id/profil-photos', function () {
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
                    .post('/users/' + userID 
                          + '/profil-photos')
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

            makeARequest(userID, {
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

    it('returns HTTP status code 400 '
       + 'when invalid profil photo url', function (done) {
        
        makeARequest(user.id, {
            url: 'bar',
            _csrf: csrfToken
        }, 400, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            done();
        });
    });

    it('returns HTTP status code 200 '
       + 'when valid profil photo url', function (done) {
        
        var url = 'https://evenid.s3.amazonaws.com'
                    + '/users/logos/' + uploadHash;

        makeARequest(user.id, {
            url: url,
            _csrf: csrfToken
        }, 200, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.text.match(new RegExp(uploadHash)));

            done();
        });
    });
});