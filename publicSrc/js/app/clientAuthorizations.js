var $ = require('jquery');

module.exports = {
    load: function () {
        $('.checkbox-has-sub-cat').on('change', function (e) {
            var $this = $(this);
            var $subcat = $this.parents('.checkbox').next('.checkbox-sub-cat');

            if ($this.is(':checked')) {
                $subcat.show();
            } else {
                $subcat.hide();
            }
        });

        $('.checkbox-phone-matter').on('change', function (e) {
            var $this = $(this);
            var $checkboxMatter = $('.checkbox-phone-matter:checked');
            var $checkboxNotMatter = $('.checkbox-phone-doesnt-matter');

            if ($this.is(':checked')) {
                $checkboxNotMatter.prop('checked', false);
            } else if (!$checkboxMatter.length) {
                $checkboxNotMatter.prop('checked', true);
            }
        });
    }
};