module.exports = function (csrfToken) {
    var context = this;
    var number = '+33638495868';

    if (context.phoneType === 'landline') {
        number = '+33491374859';
    }

    return {
        number: number,
        country: 'FR',
        _csrf: csrfToken
    };
};