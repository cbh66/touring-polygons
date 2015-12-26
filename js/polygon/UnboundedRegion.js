define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "polygon/HalfPlane",
        "util/geom",
        "lib/lodash"
    ], function (
        declare,
        lang,
        HalfPlane,
        geom,
        _
    ) {

    // Represented as a series of HalfPlanes.  Expected to be convex;
    //   set this.reflex=true to invert.
    //   Also expected that the hull is made of each halfplane *in that order*
    var UnboundedRegion = declare(null, {

        constructor: function () {
            this.wide = false;
            this.bounds = [];
        },

        addBounds: function (newBounds) {
            Array.prototype.push.apply(this.bounds, arguments);
        },

        drawTo: function (surface, color) {
            color = color || "transparent";
            var dimensions = surface.getDimensions();
            var width = dimensions.width;
            var height = dimensions.height;
            var current = this.bounds[0];
            var segment = geom.lineToSegment(current.slope, current.intercept, {
                l: -width, w: 3*width, t: -height, h: 3*height
            });

            var intersection;
            function startOnCorrectSide(bound) {
                if (bound === current) return true;
                return bound.onCorrectSide(segment.start) === !this.wide;
            }
            if (_.all(this.bounds, startOnCorrectSide, this)) {
                intersection = segment.start;
            } else {
                intersection = segment.end;
            }
            var pathPoints = [intersection];

            for (var i = 1; i < this.bounds.length; ++i) {
                current = this.bounds[i - 1];
                intersection = geom.lineIntersectionPoint(current.slope, current.intercept,
                                            this.bounds[i].slope, this.bounds[i].intercept);
                if (intersection && intersection !== Infinity) {
                    pathPoints.push(intersection);
                }
            }

            current = this.bounds[this.bounds.length - 1];
            segment = geom.lineToSegment(current.slope, current.intercept, {
                l: -width, w: 3*width, t: -height, h: 3*height
            });
            if (_.all(this.bounds, startOnCorrectSide, this)) {
                intersection = segment.start;
            } else {
                intersection = segment.end;
            }
            pathPoints.push(intersection);
            var path = this._connectAndDraw(pathPoints, surface, width, height)
            path.setFill(color);
            return path;
        },

        _connectAndDraw: function (points, surface, width, height) {
            var boxPoints = [{x:-width, y:-height}, {x:-width, y: 2*height},
                                {x:2*width, y:-height}, {x:2*width, y:2*height}];
            var center = this._getCenter();

            var lastPoint = points[points.length - 1];
            boxPoints = _.filter(boxPoints, function (p) {
                return this.pointWithin(p);
            }, this);
            boxPoints.push(points[0], lastPoint)
            boxPoints = geom.sortRadiallyAbout(center, boxPoints);

            var i = 0;
            var direction;
            for (; i < boxPoints.length; ++i) {
                if (boxPoints[i] === lastPoint) {
                    // Go in the direction AWAY from the other point
                    if ((i === 0 && boxPoints[boxPoints.length - 1] === points[0]) ||
                            boxPoints[i - 1] === points[0]) {
                        direction = 1;
                    } else {
                        direction = -1;
                    }
                    break;
                }
            }

            function increment(i, inc, max) {
                i += inc;
                while (i < 0) i += max;
                return i % max;
            }
            while (boxPoints[i] !== points[0]) { // Go in circle from last back to first
                i = increment(i, direction, boxPoints.length);
                points.push(boxPoints[i]);
            }

            return surface.createPolyline(points).setStroke("blue");
        },

        _getCenter: function () {
            if (this.bounds.length === 0) {
                return {x: 0, y: 0};
            } else {
                var mid = Math.floor(this.bounds.length / 2);
                var bound = this.bounds[mid];
                var midIntersection = null;
                _.each(this.bounds, function (otherBound) {
                    var intersection = geom.lineIntersectionPoint(bound.slope, bound.intercept,
                                                        otherBound.slope, otherBound.intercept);
                    if (intersection && intersection !== Infinity) {
                        midIntersection = intersection;
                        return false;
                    }
                }, this);
                return midIntersection || {x: 0, y: this.bounds[0].intercept};
            }
        },

        pointWithin: function (point) {
            var enough = _.all;
            if (this.wide) {
                enough = _.any;
            }
            return enough(this.bounds, function (bound) {
                return bound.onCorrectSide(point);
            }, this);
        }
    });

    return UnboundedRegion;
});
