var validator = require('validator');
var moment = require('moment-timezone');

var isLoggedIn = require('../../users/callbacks/isLoggedIn');

module.exports = function (req, res, next) {
    var period = validator.trim(req.query.period);

    var user = req.session.login.user;
    var userTimezone = user.timezone || 'UTC';

    var currentLocale = req.i18n.getLocale();

    var today = new Date();

    var stats = res.locals.stats;
    var statsKeys = res.locals.statsKeys;
    var series = res.locals.series;

    var statsForHighcharts = {
        xAxis: {
            categories: []
        },

        series: series
    };

    if (!isLoggedIn(req)) {
        throw new Error('User must be logged before accessing '
                        + '`buildStatsForHighcharts` middleware');
    }

    if (!stats) {
        throw new Error('Stats must be set in response locals before '
                        + 'accessing `buildStatsForHighcharts` middleware');
    }

    if (!statsKeys) {
        throw new Error('Stats keys must be set in response locals before '
                        + 'accessing `buildStatsForHighcharts` middleware');
    }

    if (!series) {
        throw new Error('Series must be set in response locals before '
                        + 'accessing `buildStatsForHighcharts` middleware');
    }

    Object.keys(stats).forEach(function (date) {
        statsForHighcharts.xAxis.categories.push(date);
    });

    // Sort dates from older to newer
    // ISO 8601 (year-month-day)
    statsForHighcharts.xAxis.categories.sort(function (a, b) {
        return parseInt(a.replace(/-/g, '')) - parseInt(b.replace(/-/g, ''));
    });

    statsForHighcharts.xAxis.categories.forEach(function (date) {
        statsKeys.forEach(function (statsKey, index) {
            if (!statsForHighcharts.series[index].data) {
                statsForHighcharts.series[index].data = [];
            }

            statsForHighcharts.series[index].data.push(stats[date][statsKey]);
        });
    });
    
    statsForHighcharts.xAxis.categories = statsForHighcharts.xAxis.categories.map(function (date) {
        var dateMoment = moment.tz(date, 'YYYY-MM-DD', userTimezone);
        var todayMoment = function () {
            return moment.tz(today, userTimezone);
        };
        
        var dateAsString = '';

        dateMoment.locale(currentLocale);

        if (period.match(/day/)) {
            if (dateMoment.isSame(todayMoment(), 'day')) {
                return req.i18n.__('Today');
            }

            if (dateMoment.isSame(todayMoment().subtract(1, 'days'), 'day')) {
                return req.i18n.__('Yesterday');
            }
        }

        if (period.match(/month/) 
            && dateMoment.isSame(todayMoment(), 'month')) {

            return req.i18n.__('This month');
        }

        if (period.match(/year/) 
            && dateMoment.isSame(todayMoment(), 'year')) {

            return req.i18n.__('This year');
        }

        dateAsString = dateMoment.format(req.i18n.__('client.statistics.date.format.' 
                                        // [0-9]+\s(day|month|year)s?
                                        // Get ^(day|month|year)$
                                        + period.replace(/([0-9]+)|(\s+)|(s$)/g, '')));

        // Uppercase first letter
        return dateAsString.charAt(0).toUpperCase() 
             + dateAsString.slice(1);
    });

    res.locals.statsForHighcharts = statsForHighcharts;

    next();
};