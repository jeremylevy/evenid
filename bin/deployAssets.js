var fs = require('fs');
var zlib = require('zlib');

var AWS = require('aws-sdk');
var async = require('async');

var mime = require('mime');
var minify = require('minify');
var CleanCSS = require('clean-css');

var jsonVersion = require('../version.json');

var config = require('../config');

var directories = require('../utils/directories');

var s3 = new AWS.S3({
    accessKeyId: process.env.EVENID_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.EVENID_AWS_ACCESS_KEY_SECRET,
    region: process.env.EVENID_AWS_S3_REGION,
    sslEnabled: true
});

var version = jsonVersion.version;

// Ten years
var cacheControlMaxAge = 3600 * 24 * 365 * 10;

// Get from AWS Cloudfront
// not S3 directly
var acl = 'private';

var fns = [];

// For each assets
directories.loadDirSync(__dirname + '/../public', [], function (filePath) {
    fns.push(function (cb) {
        // Read the file
        fs.readFile(filePath, function (err, data) {
            var params = {
                Bucket: process.env.EVENID_AWS_S3_BUCKET_NAME,
                Key: filePath.substr(filePath.indexOf('/public'))
                             .replace(/^\/public/, version),
                Body: null,
                CacheControl: 'max-age=' + cacheControlMaxAge,
                ContentType: mime.lookup(filePath),
                ACL: acl
            };

            var putObject = function (params, cb) {
                s3.putObject(params, function (err, data) {
                    if (err) {
                        return cb(err);
                    }

                    console.log(params.Key);

                    cb(null, data);
                });
            };

            var compressCallback = function (err, data) {
                if (err) {
                    return cb(err);
                }

                params.Body = data;

                putObject(params, function (err, data) {
                    if (err) {
                        return cb(err);
                    }

                    zlib.gzip(params.Body, function (err, buffer) {
                        if (err) {
                            return cb(err);
                        }

                        // We don't want to 
                        // overwrite uncompressed file
                        params.Key += '.gz';
                        params.Body = buffer;
                        params.ContentEncoding = 'gzip';

                        putObject(params, function (err, data) {
                            if (err) {
                                return cb(err);
                            }

                            cb(null, data);
                        });
                    });
                });
            };

            if (err) {
                return cb(err);
            }

            params.Body = data;

            if (['text/css', 'application/javascript'].indexOf(params.ContentType) !== -1) {
                // Note sure why but `minify` module
                // sucks with CSS file.
                // (It seems to inline font !?)
                if ('text/css' === params.ContentType) {
                    compressCallback(null, new CleanCSS({
                        // .hidden becames `{visibility: hidden}`
                        // Wtf ?!
                        advanced: false,
                        aggressiveMerging: false
                    }).minify(data).styles);

                    return;
                }

                minify(filePath, compressCallback);

                return;
            }

            putObject(params, cb);
        });
    });
});

async.parallel(fns, function (err, results) {
    if (err) {
        return console.error(err);
    }

    console.log('Deploy OK');

    process.exit(0);
});