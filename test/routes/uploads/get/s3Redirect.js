var crypto = require('crypto');
var assert = require('assert');

var querystring = require('querystring');
var mongoose = require('mongoose');

var async = require('async');
var requestExt = require('request');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

var validUploadHash = function () {
    return crypto.createHash('sha1')
                 .update(mongoose.Types.ObjectId().toString())
                 .digest('hex');
};

var successReg = function (key) {
    return new RegExp('window\\.parent\\.fileUpload\\.handleEnd\\(\'(' 
                      + config.EVENID_AWS
                              .CLOUDFRONT
                              .URLS
                              .UPLOADS
                      + '/' 
                      + key 
                      + '/200)'
                      + '\'\\);');
};

describe('GET /s3-redirect', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (bucketKey, statusCode, request, cb) {
                var query = {
                    bucket: 'barBucket',
                    key: bucketKey,
                    etag: 'barEtag'
                };

                request
                    .get('/s3-redirect?' + querystring.stringify(query))
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

            makeARequest('', 302, request, function (err, resp) {
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

    it('sends bad request error when unauthorized bucket key was passed', function (done) {
        makeARequest('barKey', 400, request, function (err, resp) {
            if (err) {
                return done(err);
            }

            isInvalidRequestResponse(resp.text);

            done();
        });
    });

    it('sends s3 redirect page with call to parent windows function '
       + 'when logged user and user profil photo bucket key', function (done) {
        
        var bucketKey = 'users/profil-photos/' + validUploadHash();
        var checkPhotoFns = [];

        makeARequest(bucketKey, 200, request, function (err, resp) {
            var urlMatches = !err && resp.text.match(successReg(bucketKey));

            if (err) {
                return done(err);
            }

            assert.ok(urlMatches.length);

            config.EVENID_PHOTOS.AVAILABLE_SIZES.forEach(function (size) {
                checkPhotoFns.push(function (cb) {
                    requestExt.get(urlMatches[1].replace(/\/[0-9]+$/, '/' + size), {
                        // Fix unauthorized cert error
                        // See https://github.com/nodejs/node-v0.x-archive/issues/8894
                        rejectUnauthorized: false,
                        // Keep the body as buffer
                        encoding: null
                    }, function (error, response, body) {
                        var magigNumberInBody = !error && body.toString('hex', 0, 4);

                        assert.ok(!error && response.statusCode === 200);
                        
                        assert.strictEqual(magigNumberInBody, '89504e47');
                        
                        cb();
                    });
                });
            });

            async.parallel(checkPhotoFns, done);
        });
    });

    it('sends s3 redirect page with call to parent windows function '
       + 'when logged user and create/update client logo bucket key', function (done) {

        var bucketKey = 'clients/logos/' + validUploadHash();
        var checkPhotoFns = [];

        makeARequest(bucketKey, 200, request, function (err, resp) {
            var urlMatches = !err && resp.text.match(successReg(bucketKey));

            if (err) {
                return done(err);
            }

            assert.ok(urlMatches.length);

            config.EVENID_PHOTOS.AVAILABLE_SIZES.forEach(function (size) {
                checkPhotoFns.push(function (cb) {
                    requestExt.get(urlMatches[1].replace(/\/[0-9]+$/, '/' + size), {
                        // Fix unauthorized cert error
                        // See https://github.com/nodejs/node-v0.x-archive/issues/8894
                        rejectUnauthorized: false,
                        // Keep the body as buffer
                        encoding: null
                    }, function (error, response, body) {
                        var magigNumberInBody = !error && body.toString('hex', 0, 4);

                        assert.ok(!error && response.statusCode === 200);
                        
                        // PNG
                        assert.strictEqual(magigNumberInBody, '89504e47');
                        
                        cb();
                    });
                });
            });

            async.parallel(checkPhotoFns, done);
        });
    });
});