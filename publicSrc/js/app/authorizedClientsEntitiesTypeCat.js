var $ = require('jquery');

module.exports = {
    load: function () {
        $('.entities-type-list li a:not(.disabled)').on('click', function (e) {
            var $a = $(this);
            var entity = $a.data('entity');
            var $ul = $a.parents('.entities-type-list');

            $ul.find('a.selected')
                .removeClass('selected');

            $a.addClass('selected');

            $('.clip-list li').addClass('hidden')
                            .parent()
                            .find('li.' + entity)
                            .removeClass('hidden');

            return false;
        });
    }
};