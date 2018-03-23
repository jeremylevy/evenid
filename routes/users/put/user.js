var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')$');

    app.put(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var nickname = validator.trim(req.body.nickname);
        var firstName = validator.trim(req.body.first_name);
        var lastName = validator.trim(req.body.last_name);

        var dateOfBirthMonth = validator.trim(req.body.date_of_birth_month);
        var dateOfBirthDay = validator.trim(req.body.date_of_birth_day);
        var dateOfBirthYear = validator.trim(req.body.date_of_birth_year);

        var placeOfBirth = validator.trim(req.body.place_of_birth);
        var gender = validator.trim(req.body.gender);

        var nationality = validator.trim(req.body.nationality);
        var timezone = validator.trim(req.body.timezone);

        var userID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            updateUser: function (cb) {
                apiClient.makeRequest('PUT', '/users/' + userID, {
                    nickname: nickname,
                    first_name: firstName,
                    last_name: lastName,
                    date_of_birth_month: dateOfBirthMonth,
                    date_of_birth_day: dateOfBirthDay,
                    date_of_birth_year: dateOfBirthYear,
                    place_of_birth: placeOfBirth,
                    gender: gender,
                    nationality: nationality,
                    timezone: timezone
                }, function (err, user) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, user);
                });
            }
        }, function (err, results) {
            if (err) {
                return next(err);
            }

            req.flash('update.user', 'YES');

            req.flash('notification', req.i18n.__('Your personal information has been successfully updated.'));
            req.flash('notification.type', 'success');

            res.redirect(req.path);
        });
    });
};