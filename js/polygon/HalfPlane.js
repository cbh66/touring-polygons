define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojox/gfx",
        "dojox/gfx/Moveable",
        "util/geom",
        "lib/lodash"
    ], function (
        declare,
        lang,
        gfx,
        Moveable,
        geom,
        _
    ) {

    /**
     *  @class
     *  @name  Canvas
     */
    var HalfPlane = declare(null, {

        constructor: function (slope, intercept, dir) {
            this.slope = slope;
            this.intercept = intercept;
            this.dir = dir; // positive or negative
        },

        onCorrectSide: function (point) {
            return (this.dir < 0) == (geom.sideOfLine(point) < 0);
        },

        asLineOn: function (surface, stroke) {
            var start, end, width, height;
            stroke = stroke || "red";
            width = surface.width || surface.rawNode.width.animVal.value;
            height = surface.height || surface.rawNode.height.animVal.value;
            if (_.isFinite(this.slope)) {
                start = {
                    x: -width,
                    y: this.intercept - width * this.slope
                };
                end = {
                    x: 2*width,
                    y: this.intercept + 2*width * this.slope
                };
            } else {
                start = {
                    x: this.intercept,
                    y: -height
                };
                end = {
                    x: this.intercept,
                    y: 2*height
                };
            }
            return surface.createLine({
                x1: start.x,
                y1: start.y,
                x2: end.x,
                y2: end.y
            }).setStroke(stroke);
        }

    });

    return HalfPlane;
});
