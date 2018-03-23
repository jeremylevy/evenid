module.exports = function (app, express) {
    app.get('/features', function (req, res) {
        res.render('features');
    });
};