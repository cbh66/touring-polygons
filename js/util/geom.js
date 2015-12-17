define([
        "lib/lodash"
    ], function (
        _
    ) {

    /**
     *  @namespace
     *  @name  geom
     */
    var geom = {

        // May be NaN/inf if vertical
        segmentSlope: function (segment) {
            return (segment.end.y - segment.start.y) /
                    (segment.end.x - segment.start.x);
        },

        // y intercept, or x intercept if vertical
        segmentIntercept: function (segment, slope) {
            if (!slope) {
                slope = geom.segmentSlope(segment);
            }
            if (_.isFinite(slope)) {
                return segment.start.y - (slope * segment.start.x);
            } else {
                return segment.start.x;
            }
        },

        segmentMidpoint: function (segment) {
            var midpoint = {
                x: (segment.start.x + segment.end.x) / 2,
                y: (segment.start.y + segment.end.y) / 2
            };
            return midpoint;
        },

        // Returns a point of intersection, Infinity if collinear, or null if parallel
        // if a slope is NaN, aIntercept should be x intercept.  Otherwise should be y.
        lineIntersectionPoint: function (aSlope, aIntercept, bSlope, bIntercept) {
            if (!_.isFinite(aSlope)) {
                if (!_.isFinite(bSlope)) {                  // Both vertical
                    if (aIntercept === bIntercept) {
                        return Infinity;
                    } else {
                        return null;
                    }
                } else {     // One vertical, one not
                    return {
                        x: aIntercept,
                        y: bIntercept + (bSlope * aIntercept)
                    };
                }
            } else if (!_.isFinite(bSlope)) {  // One vertical, one not
                return {
                    x: bIntercept,
                    y: aIntercept + (aSlope * bIntercept)
                };
            } else if (aSlope === bSlope) {  // Parallel or collinear
                if (aIntercept === bIntercept) {
                    return Infinity;
                } else {
                    return null;
                }
            } else {
                var xVal = (bIntercept - aIntercept) / (aSlope - bSlope);
                return {
                    x: xVal,
                    y: aIntercept + (aSlope * xVal)
                };
            }
        },

        pointOnSegment: function (point, segment) {
            var slope = geom.segmentSlope(segment);
            var intercept = geom.segmentIntercept(segment, slope);
            var min, max;
            if (_.isFinite(slope)) {
                min = Math.min(segment.start.x, segment.end.x);
                max = Math.max(segment.start.x, segment.end.x);
                return geom.pointOnLine(point, slope, intercept) &&
                        min <= point.x && point.x <= max;
            } else {
                min = Math.min(segment.start.y, segment.end.y);
                max = Math.max(segment.start.y, segment.end.y);
                return point.x === segment.start.x &&
                        min <= point.y && point.y <= max;
            }
        },

        segmentsIntersect: function (a, b) {
            var aStart = Math.min(a.start.x, a.end.x);
            var aEnd = Math.max(a.start.x, a.end.x);
            var bStart = Math.min(b.start.x, b.end.x);
            var bEnd = Math.max(b.start.x, b.end.x);

            if (aEnd < bStart || aStart > bEnd) {
                return null;
            }
            var xInterval = [Math.max(aStart, bStart), // Any intersection must
                             Math.min(aEnd, bEnd)];    // be in this interval

            var aSlope = geom.segmentSlope(a);
            var bSlope = geom.segmentSlope(b);
            var aIntercept = geom.segmentIntercept(a, aSlope);
            var bIntercept = geom.segmentIntercept(b, bSlope);
            var intersection = geom.lineIntersectionPoint(aSlope, aIntercept, bSlope, bIntercept);
            if (intersection === null || intersection === Infinity) {
                return intersection;
            }
            if (intersection.x >= xInterval[0] && intersection.x <= xInterval[1]) {
                return intersection;
            } else {
                return null;
            }
        },

        squareDistance: function (a, b) {
            var dx = a.x - b.x;
            var dy = a.y - b.y;
            return dx * dx + dy * dy;
        },

        sideOfLine: function (point, slope, intercept) {  // Returns pos, neg, or zero
            if (_.isFinite(slope)) {
                var y = slope * point.x + intercept;
                return point.y - y;
            } else {
                return point.x - intercept;
            }
        },

        pointOnLine: function (point, slope, intercept, leeway) {
            leeway = leeway || 0.0000001
            return Math.abs(geom.sideOfLine(point, slope, intercept)) <= leeway;
        }
    };

    return geom;
});
