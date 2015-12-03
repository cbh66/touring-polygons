define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojox/gfx",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_OnDijitClickMixin",
        "polygon/Polygon",
        "lib/lodash"
    ], function (
        declare,
        lang,
        gfx,
        _WidgetBase,
        _TemplatedMixin,
        _OnDijitClickMixin,
        Polygon,
        _
    ) {


    /**
     *  @class
     *  @name  Canvas
     */
    var Canvas = declare([_WidgetBase, _TemplatedMixin, _OnDijitClickMixin], {
        templateString: "<div></div>",

        constructor: function () {
            this.shapes = [];
            this.incompleteShape = false;
        },

        postCreate: function () {
            var surface = this.surface = gfx.createSurface(this.domNode);
            var ourClick = false;
            var self = this;
            this.on("mousedown", function () {
                ourClick = true;
            });
            this.on("mouseup", function (e) {
                if (ourClick) {
                    self._onClick(e);
                    ourClick = false;
                }
            });
            return this.inherited(arguments);
        },

        _onClick: function (e) {
            if (!this.incompleteShape) {
                var self = this;
                var newPolygon = new Polygon(this.surface);
                newPolygon.onPointCreate(0, function (firstVertex) {
                    var callbacks = [];
                    callbacks.push(firstVertex.on("mouseover", function () {
                        firstVertex.setFill("red");
                    }));
                    callbacks.push(firstVertex.on("mouseout", function () {
                        firstVertex.setFill("yellow");
                    }));
                    callbacks.push(firstVertex.on("mousedown", function (e) {
                        _.each(callbacks, function (callback) {
                            callback.remove();
                        }, this);
                        e.stopPropagation();  // Don't want to make a new point
                        newPolygon.close();
                        self.incompleteShape = false;
                        firstVertex.setFill("yellow");
                    }));
                });
                this.shapes.push(newPolygon);
                this.incompleteShape = true;
            }
            var inProgress = this.shapes[this.shapes.length - 1];
            inProgress.addPoint({x: e.layerX, y: e.layerY});
        }
    });

    return Canvas;
});
