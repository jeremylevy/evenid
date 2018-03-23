module.exports = function (app, express) {
    app.get('/privacy', function (req, res) {
        var currentLocale = req.i18n.getLocale();

        res.render('privacy_' + currentLocale);
    });
};