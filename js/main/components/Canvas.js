define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "polygon/Canvas",
        "dijit/_WidgetBase",
        "polygon/tools/PolygonCreationTool",
        "lib/lodash"
    ], function (
        declare,
        lang,
        Canvas,
        _WidgetBase,
        PolygonCreationTool,
        _
    ) {


    /**
     *  @class
     *  @name  Canvas
     */
    var MainCanvas = declare(_WidgetBase, {

        constructor: function () {
            this.setup();
        },

        setup: function () {
            if (!this.canvas) {
                this.canvas = new Canvas();
            }
        },

        startup: function () {
            this.setup();
            this.canvas.startup();
        },

        onAppStart: function () {
            this.setup();
            this.addTools();
        },

        getSurface: function () {
            return this.canvas.surface;
        },

        placeAt: function () {
            this.setup();
            this.canvas.placeAt.apply(this.canvas, arguments);
        },

        addTools: function () {
            this.canvas.addTool(new PolygonCreationTool());
            this.canvas.addTool(this._pathFinderTool);
        }
    });

    return MainCanvas;
});
