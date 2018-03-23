var $ = require('jquery');

module.exports = {
    load: function () {
        var $periodLinks = $('.stats-period-link');

        $periodLinks.on('click', function (e) {
            var $link = $(this);

            if ($link.hasClass('selected')) {
                return false;
            }

            $periodLinks.removeClass('selected');
            $link.addClass('selected');

            app.clientStats.loadChartFor($link.data('period'));

            return false;
        });
    },

    loadChartFor: function (period) {
        var $chartLoader = $('#client-stats-chart-loader');
        var $chartError = $('#client-stats-chart-error');
        var $chart = $('#client-stats-chart');

        $chart.hide();
        $chartLoader.show();

        // Load Zopim live chat after chart animation.
        // Better UI.
        $('body').data('has-highcharts', true);

        $.ajax({
            url: $chart.data('data-url'),
            data: {
                period: period
            }
        }).done(function (data, textStatus, jqXHR) {
            $('#client-stats-chart').highcharts({
                plotOptions: {
                    series: {
                        animation: {
                            complete: function () {
                                // Load Zopim live chat after chart animation.
                                // Better UI.
                                $(document).trigger('evenID.highcharts.loaded');
                            }
                        }
                    }
                },

                title: {
                    text: null
                },

                subtitle: {
                    text: null
                },

                xAxis: {
                    categories: data.xAxis.categories
                },

                yAxis: {
                    title: {
                        text: null
                    }
                },

                tooltip: {
                    shared: true,
                    crosshairs: true,
                    borderColor: '#ddd',
                    shadow: false
                },

                series: data.series,

                credits: {
                    enabled: false
                }
            });

            $chartError.hide();
            $chartLoader.hide();
            $chart.show();
        }).fail(function (jqXHR, textStatus, errorThrown) {
            $chartLoader.hide();
            $chart.hide();
            $chartError.show();
        });
    }
};