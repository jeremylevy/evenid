module.exports = function (app, express) {
    app.get('/about', function (req, res) {
        res.render('about');
    });
};