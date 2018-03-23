var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');
var uploadParamsForProfilPhoto = require('../middlewares/uploadParamsForProfilPhoto');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            findUser: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID, {}, function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    resp.user.date_of_birth = new Date(resp.user.date_of_birth);

                    cb(null, resp);
                });
            },

            findAuthorizations: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/authorizations', 
                                      {}, function (err, authorizations) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, authorizations);
                });
            }
        }, function (err, results) {
            var findUserResp = results && results.findUser;
            var authorizations = results && results.findAuthorizations;

            if (err) {
                return next(err);
            }

            res.locals.user = findUserResp.user;
            res.locals.authorizations = authorizations;
            
            res.locals.months = findUserResp.months;
            res.locals.nationalities = findUserResp.nationalities;

            res.locals.territories = findUserResp.territories;
            res.locals.timezones = findUserResp.timezones;

            next();
        });
    }, uploadParamsForProfilPhoto, function(req, res, next) {
        res.render('users/user');
    });
};