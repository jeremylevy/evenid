var async = require('async');
var validator = require('validator');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');
var buildStatsForHighcharts = require('../middlewares/buildStatsForHighcharts');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/clients/(' 
                            + config.EVENID_MONGODB
                                    .OBJECT_ID_PATTERN
                            + ')/statistics/test-accounts/for-period$');
    
    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var period = validator.trim(req.query.period);

        var clientID = req.params[0];

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            findClientStatistics: function (cb) {
                var qs = {
                    period: period
                };

                apiClient.makeRequest('GET', '/clients/' + clientID 
                                             + '/statistics/test-accounts', 
                                      qs, function (err, stats) {
                    
                    if (err) {
                        return cb(err);
                    }
                    
                    cb(null, stats);
                });
            }
        }, function (err, results) {
            var stats = results && results.findClientStatistics;
            var statsKeys = ['registered', 'conversion'];

            var series = [{
                name: req.i18n.__('Registration(s)'),
                color: '#7cb5ec'
            }, 

            {
                name: req.i18n.__('Conversion Rate'),
                color: '#90ed7d'
            }];

            if (err) {
                return next(err);
            }

            res.locals.stats = stats;
            res.locals.statsKeys = statsKeys;
            res.locals.series = series;

            next();
        });
    }, buildStatsForHighcharts, function (req, res, next) {
        res.send(res.locals.statsForHighcharts);
    });
};