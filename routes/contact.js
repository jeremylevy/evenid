module.exports = function (app, express) {
    app.get('/contact', function (req, res) {
        res.render('contact');
    });
};