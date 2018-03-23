module.exports = function (req, res, next) {
    var maxEntityDisplayed = res.locals.maxEntityDisplayed;
    var currentPage = res.locals.currentPage;
    var entityName = res.locals.entityName;
    var entities = res.locals[entityName];
    var nbOfPages = 0;

    if (!maxEntityDisplayed) {
        throw new Error('`maxEntityDisplayed` must be set as response locals '
                        + 'property before calling `paginate` '
                        + 'middleware');
    }

    if (!currentPage) {
        throw new Error('`currentPage` must be set as response locals '
                        + 'property before calling `paginate` '
                        + 'middleware');
    }

    if (!entityName) {
        throw new Error('`entityName` must be set as response locals '
                        + 'property before calling `paginate` '
                        + 'middleware');
    }

    if (!entities) {
        throw new Error('`entityName` must be equals to a response locals'
                        + 'property before calling `paginate` '
                        + 'middleware');
    }

    nbOfPages = Math.ceil(Math.max(entities.length / maxEntityDisplayed, 1));

    // Redirect to last page
    if (currentPage === 'last') {
        return res.redirect(req.path.replace(new RegExp(currentPage + '$'), nbOfPages));
    }

    currentPage = parseInt(currentPage);

    // Current page cannot be inferior to '1'. See the URL.
    if (currentPage > nbOfPages) {
        return next('route');
    }

    res.locals.nbOfPages = nbOfPages;
    res.locals.currentPage = currentPage;
    res.locals.previousDisabled = (currentPage === 1);
    res.locals.nextDisabled = (currentPage === nbOfPages);
    res.locals[entityName] = entities.slice((currentPage - 1) * maxEntityDisplayed, 
                                           ((currentPage - 1) * maxEntityDisplayed) + maxEntityDisplayed);

    next();
};