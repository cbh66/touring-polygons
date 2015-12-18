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
            return (this.dir < 0) == (geom.sideOfLine(point, this.slope, this.intercept) < 0);
        },

        asLineOn: function (surface, stroke) {
            stroke = stroke || "red";
            var width = surface.width || surface.rawNode.width.animVal.value;
            var height = surface.height || surface.rawNode.height.animVal.value;
            var segment = geom.lineToSegment(this.slope, this.intercept, {
                l: -width, w: 2*width, t: -height, h: 2*height
            });
            return surface.createLine({
                x1: segment.start.x,
                y1: segment.start.y,
                x2: segment.end.x,
                y2: segment.end.y
            }).setStroke(stroke);
        }

    });

    return HalfPlane;
});
