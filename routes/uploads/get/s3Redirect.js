var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

var _apiClient = require('../../../libs/apiClient');

module.exports = function (app, express) {
    app.get('/s3-redirect', checkIfUserIs('logged'), function (req, res, next) {
        var bucketName = validator.trim(req.query.bucket);
        var bucketKey = validator.trim(req.query.key);
        
        var etag = validator.trim(req.query.etag);

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            resizePhoto: function (cb) {
                var dataToSend = {
                    bucket_key: bucketKey
                };

                apiClient.makeRequest('POST', '/uploads/resize-photo', 
                                      dataToSend, function (err, resp) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp.original_photo_url);
                });
            }
        }, function (err, results) {
            var originalPhotoURL = results && results.resizePhoto;

            if (err) {
                return next(err);
            }

            res.render('uploads/s3Redirect', {
                publicURL: originalPhotoURL + '/200'
            });
        });
    });
};