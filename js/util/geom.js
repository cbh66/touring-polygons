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

        lineToSegment: function (slope, intercept, box) { // box: h, w, t, l
            var start, end;
            if (_.isFinite(slope)) {
                start = {
                    x: box.l,
                    y: intercept + box.l * slope
                };
                end = {
                    x: box.l + box.w,
                    y: intercept + (box.l + box.w) * slope
                };
            } else {
                start = {
                    x: intercept,
                    y: box.t
                };
                end = {
                    x: intercept,
                    y: box.l + box.t
                };
            }
            return {start: start, end: end};
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
                return geom.pointOnLine(point, slope, intercept) &&
                        min <= point.y && point.y <= max;
            }
        },

        segmentsIntersect: function (a, b) {
            var aStartX = Math.min(a.start.x, a.end.x);
            var aEndX = Math.max(a.start.x, a.end.x);
            var bStartX = Math.min(b.start.x, b.end.x);
            var bEndX = Math.max(b.start.x, b.end.x);

            if (aEndX < bStartX || aStartX > bEndX) {
                return null;
            }

            var aSlope = geom.segmentSlope(a);
            var bSlope = geom.segmentSlope(b);
            var aIntercept = geom.segmentIntercept(a, aSlope);
            var bIntercept = geom.segmentIntercept(b, bSlope);

            var intersection = geom.lineIntersectionPoint(aSlope, aIntercept, bSlope, bIntercept);
            if (intersection === null || intersection === Infinity) {
                return intersection;
            }
            var aStartY = Math.min(a.start.y, a.end.y);
            var aEndY = Math.max(a.start.y, a.end.y);
            var bStartY = Math.min(b.start.y, b.end.y);
            var bEndY = Math.max(b.start.y, b.end.y);
            if (aEndY < bStartY || aStartY > bEndY) {
                return null;
            }
            var xInterval = [Math.max(aStartX, bStartX), // Any intersection must
                             Math.min(aEndX, bEndX)];    // be in these intervals
            var yInterval = [Math.max(aStartY, bStartY),
                             Math.min(aEndY, bEndY)];
            if (xInterval[0] <= intersection.x && intersection.x <= xInterval[1] &&
                yInterval[0] <= intersection.y && intersection.y <= yInterval[1]) {
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
            leeway = leeway || 0.00001
            return Math.abs(geom.sideOfLine(point, slope, intercept)) <= leeway;
        },

        angleBetweenLines: function (slope1, slope2) {
            if (!_.isFinite(slope1)) {
                return (Math.PI/2) - geom.angleBetweenLines(slope2, 0);
            }
            if (!_.isFinite(slope2)) {
                return (Math.PI/2) - geom.angleBetweenLines(slope1, 0);
            }
            var x = (slope1 - slope2) / (1 + slope1*slope2);
            return Math.atan(Math.abs(x));
        },

        reflectPointOverLine: function (point, slope, intercept) {
            var reflected = {};
            if (_.isFinite(slope)) {
                var d = (point.x + (point.y - intercept) * slope) / 
                            (1 + slope*slope);
                reflected.x = 2*d - point.x;
                reflected.y = 2*d*slope - point.y + 2*intercept;
            } else {
                reflected.y = point.y;
                reflected.x = 2*intercept - point.x;
            }
            return reflected;
        },

        sortRadiallyAbout: function (center, points) { // Sorts clockwise from 12 oclock
            function compare(a, b) {
                var xDiffA = a.x - center.x;
                var xDiffB = b.x - center.x;
                if (xDiffA >= 0 && xDiffB < 0)
                    return -1;
                if (xDiffA < 0 && xDiffB >= 0)
                    return 1;
                if (xDiffA == 0 && xDiffB == 0) {
                    if (a.y - center.y >= 0 || b.y - center.y >= 0)
                        return a.y > b.y ? -1 : 1;
                    return b.y > a.y ? -1 : 1;
                }

                // compute the cross product of vectors (center -> a) x (center -> b)
                var det = (xDiffA) * (b.y - center.y) - (xDiffB) * (a.y - center.y);
                if (det < 0)
                    return -1;
                if (det > 0)
                    return 1;

                // points a and b are on the same line from the center
                // check which point is closer to the center
                var d1 = (xDiffA * xDiffA) + (a.y - center.y) * (a.y - center.y);
                var d2 = (xDiffB * xDiffB) + (b.y - center.y) * (b.y - center.y);
                return d1 > d2 ? -1 : 1;
            }
            var sortedArray = _.clone(points);
            sortedArray.sort(compare);
            return sortedArray;
        }
    };

    return geom;
});
