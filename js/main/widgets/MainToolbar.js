define([
        "dojo/_base/declare",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_OnDijitClickMixin",
        "dojo/text!main/widgets/templates/MainToolbar.html",
        "lib/lodash"
    ], function (
        declare,
        _WidgetBase,
        _TemplatedMixin,
        _OnDijitClickMixin,
        toolbarTemplateString,
        _
    ) {

    var Toolbar = declare([_WidgetBase, _TemplatedMixin, _OnDijitClickMixin], {
        templateString: toolbarTemplateString,

        services: function () {
            return [
                {name: "_startConstruction", source: "startConstruction"}
            ];
        },

        _startConstruction: function () {
            console.error("App not connected");
        }
    });
    
    return Toolbar;
});