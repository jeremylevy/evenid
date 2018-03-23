module.exports = function (app, express) {
    app.get('/faq', function (req, res) {
        res.render('faq');
    });
};