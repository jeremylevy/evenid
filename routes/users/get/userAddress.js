var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/addresses/('
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                            + ')$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];
        var user = req.session.login.user;

        var addressID = req.params[1];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            findAddress: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/addresses/' + addressID, 
                                      {}, function (err, resp) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            findAuthorizations: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/authorizations'
                                      + '?entity=addresses&entity_id=' + addressID, 
                                      {}, function (err, authorizations) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, authorizations);
                });
            }
        }, function (err, results) {
            var authorizations = results && results.findAuthorizations;
            var findAddressResp = results && results.findAddress;

            if (err) {
                return next(err);
            }

            res.render('users/addresses', {
                user: user,
                authorizations: authorizations,
                addresses: [findAddressResp.address],
                address: findAddressResp.address,
                territories: findAddressResp.territories
            });
        });
    });
};