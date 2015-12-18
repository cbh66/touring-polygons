define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojox/gfx",
        "dojox/gfx/Moveable",
        "polygon/LastStepShortestPathMap",
        "lib/lodash"
    ], function (
        declare,
        lang,
        gfx,
        Moveable,
        LastStepShortestPathMap,
        _
    ) {


    /**
     *  @class
     *  @name  Canvas
     */
    var PathFinder = declare(null, {

        constructor: function () {
            this.polygons = [];
        },

        services: function () {
            return [
                {name: "getSurface", source: "getSurface"}
            ];
        },

        onAppStart: function () {
            function fixProps(point) {
                point.moveToFront();
                point.x = point.shape.cx;
                point.y = point.shape.cy;
                var m = new Moveable(point);
                m.onMoved = function (mover, shift) {
                    point.x = point.shape.cx += shift.dx;
                    point.y = point.shape.cy += shift.dy;
                }
                return m;
            }
            var surface = this.getSurface()
            this.startPoint = surface.createCircle({
                cx: 50,
                cy: 50,
                r: 10
            }).setFill("green").setStroke("blue");
            this.startPointMover = fixProps(this.startPoint);

            this.endPoint = surface.createCircle({
                cx: 100,
                cy: 100,
                r: 10
            }).setFill("red").setStroke("blue");
            this.endPointMover = fixProps(this.endPoint);
        },

        startConstruction: function () {
            if (this.polygons.length == 0) {
                console.log("NO POLYGONS!  This is the easiest case.")
            } else {
                var first = new LastStepShortestPathMap(this.startPoint, this.polygons[0], [],
                    this.getSurface());
                console.log(first);
            }
        },

        onNewPolygon: function (polygon) {
            this.polygons.push(polygon);
        }

    });

    return PathFinder;
});
