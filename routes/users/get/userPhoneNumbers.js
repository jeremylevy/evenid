var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');
var paginate = require('../middlewares/paginate');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/phone-numbers(?:/page/((?:[1-9]+[0-9]*)|last))?$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];
        var currentPage = req.params[1] || 1;
        
        var user = req.session.login.user;

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            findPhoneNumbers: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/phone-numbers', 
                                      {}, function (err, resp) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, resp);
                });
            },

            findAuthorizations: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/authorizations?entity=phone_numbers', 
                                      {}, function (err, authorizations) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, authorizations);
                });
            }
        }, function (err, results) {
            var findPhoneNumbersResp = results && results.findPhoneNumbers;
            var authorizations = results && results.findAuthorizations;

            if (err) {
                return next(err);
            }

            res.locals.user = user;
            res.locals.authorizations = authorizations;
            res.locals.phoneNumbers = findPhoneNumbersResp.phoneNumbers;
            res.locals.territories = findPhoneNumbersResp.territories;
            res.locals.maxEntityDisplayed = config.EVENID_USERS.MAX_ENTITIES_DISPLAYED.PHONE_NUMBERS
            res.locals.currentPage = currentPage;
            res.locals.entityName = 'phoneNumbers';

            next();
        });
    }, paginate, function (req, res, next) {
        res.render('users/phoneNumbers');
    });
};