var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    app.get('/upload-policy', checkIfUserIs('logged'), function (req, res, next) {
        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            createUploadPolicy: function (cb) {
                var query = {
                    redirect_url: req.protocol + '://' 
                                + req.get('host') 
                                + '/' 
                                + config.EVENID_AWS
                                        .S3
                                        .REDIRECT_PATH
                                        .replace(new RegExp('^/'), '')
                };

                Object.keys(req.query).forEach(function (queryParam) {
                    query[queryParam] = req.query[queryParam];
                });

                apiClient.makeRequest('GET', '/uploads/policy', 
                                      query, function (err, policy) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, policy);
                });
            }
        }, function (err, results) {
            var uploadPolicy = results && results.createUploadPolicy;

            if (err) {
                return next(err);
            }

            res.send({
                uploadPolicy: uploadPolicy.params,
                formAction: uploadPolicy.formAction
            });
        });
    });
};