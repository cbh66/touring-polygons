define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "polygon/HalfPlane",
        "polygon/UnboundedRegion",
        "util/geom",
        "lib/lodash"
    ], function (
        declare,
        lang,
        HalfPlane,
        UnboundedRegion,
        geom,
        _
    ) {

    var surface;

    function isPoint(p) {
        return _.isFinite(p.x) && _.isFinite(p.y);
    }

    function isSegment(s) {
        return s.start && s.end;
    }
    function isPassThrough(point, source, polygon) {
        var segment = {
            start: source,
            end: point
        };
        return polygon.segmentIntersects(segment);
    }

    function isTangentTo(point, source, polygon) {
        var segment = {
            start: source,
            end: point
        };
        return polygon.isSegmentTangent(segment)
    }

    var ShortestPathRegion = declare([UnboundedRegion], {

        passthroughRegionColor: [0, 191, 255, 0.50],
        pointRegionColor: [255, 0, 0, 0.50],
        edgeRegionColor: [124, 252, 0, 0.50],

        constructor: function (start, source, polygon) {
            this.start = start;
            this.polygon = polygon;
            this.tangent = false;
            this.angleSum = 0;
            this._setSource(source);
            this._makeBounds(start, source);
        },

        _setSource: function (source) {
            this.source = source;
            if (isPoint(source)) {
                this.type = "point";
            } else if (isSegment(source)) {
                this.type = "edge";
            }
        },

        _makeBounds: function (start, source) {
            var bounds;
            if (this.type == "point") {
                bounds = [this._halfPlaneAt(start, source, this.polygon.prevEdge(source)),
                          this._halfPlaneAt(start, source, this.polygon.nextEdge(source))];
                // Check if angle is over 180 or something?
                // Behavior will have to change for particularly wide cones
                // Can only happen if the start point is in the region
                //      Maybe if it's tangent to the polygon?
            } else if (this.type == "edge") {
                bounds = [this._halfPlaneAt(start, source.start, source),
                          this._halfPlaneFromSegment(source),
                          this._halfPlaneAt(start, source.end, source)];
            }

            this.bounds = bounds;
            if (this.type === "point") {
                this.wide = this._isReflex();
            }
            this.drawTo(surface);
        },

        _halfPlaneAt: function (start, point, edge) {
            var segment = {
                start: start,
                end: point
            };
            var slope, intercept, direction;
            var otherPoint = edge.start;
            if (otherPoint === point) {
                otherPoint = edge.end;
            }
            if (this.type === "point" && this.polygon.isSegmentTangent(segment) &&
                    isPassThrough(geom.segmentMidpoint(edge), start, this.polygon)) {
                slope = geom.segmentSlope(segment);
                intercept = geom.segmentIntercept(segment, slope);
                this.tangent = true;
                direction = -geom.sideOfLine(otherPoint, slope, intercept);
                //this.angleSum += Math.PI/2;
                return new HalfPlane(slope, intercept, direction);
            }

            segment.start = geom.reflectPointOverLine(start, geom.segmentSlope(edge),
                                                        geom.segmentIntercept(edge));
            slope = geom.segmentSlope(segment);
            intercept = geom.segmentIntercept(segment, slope);
            direction = geom.sideOfLine(otherPoint, slope, intercept);
            if (this.type === "point") {   // Points away from this edge
                direction = -direction;
            } // else this.type === "edge", points towards the edge
            var angle = geom.angleBetweenLines(slope, geom.segmentSlope(edge));
            this.angleSum += Math.PI - 2*angle;
            return new HalfPlane(slope, intercept, direction);
        },

        _halfPlaneFromSegment: function (segment) {
            var slope = geom.segmentSlope(segment);
            var intercept = geom.segmentIntercept(segment, slope);
            var polygonQueryPoint = _.find(this.polygon.vertices, function (v) {
                return v !== segment.start && v !== segment.end;
            }, this);
            var direction = -geom.sideOfLine(polygonQueryPoint, slope, intercept);
            return new HalfPlane(slope, intercept, direction);
        },

        _isReflex: function () {
            // A special case.
            var center = this.source;
            if (this.type === "edge") {
                return false;
            }
            // Special case: if start point is within, and there is a tangent line,
            // total angle must be >180 degrees.
            if (this.isTangentRegion() && _.all(this.bounds, function (bound) {
                        return bound.onCorrectSide(this.start);
                    }, this)) {
                return true;
            }
            // Second condition makes sure bounds are tangent to vertex
            return this.angleSum > Math.PI && _.all(this.bounds, function (bound) {
                return !this.polygon.lineIntersects(bound.slope, bound.intercept);
            }, this);
        },

        isTangentRegion: function () {
            //console.log(this.tangent);
            return this.tangent;
        }
    });


    
    var LastStepShortestPathMap = declare(null, {

        constructor: function (source, polygon, previousMaps, s) {
            previousMaps = previousMaps || [];
            this.previousMaps = _.clone(previousMaps);
            this.source = source;
            this.polygon = polygon;
            this.surface = surface = s;   /////////////// GLOBAL FOR DEBUGGING ///////////////
            this.setupRegions();
        },

        setupRegions: function () {
            this.regions = [];
            var first = this.polygon.vertices[0];
            var currentEdge = this.polygon.nextEdge(first);
            var currentVertex = first;
            //var first = new ShortestPathRegion(this.source, this.polygon.edges[0], this.polygon);
            var region;
            if (!isPassThrough(currentVertex, this.source, this.polygon)) {
                region = this.makeOneRegion(currentVertex);
                this.regions.push(region);
                if (!isPassThrough(geom.segmentMidpoint(currentEdge),
                                    this.source, this.polygon)) {
                    this.regions.push(this.makeOneRegion(currentEdge));
                }
            } else {
                console.log("rejected", currentVertex);
            }
            currentVertex = currentEdge.end;
            currentEdge = this.polygon.nextEdge(currentVertex);
            while (currentVertex !== first) {
                if (!isPassThrough(currentVertex, this.source, this.polygon)) {
                    region = this.makeOneRegion(currentVertex);
                    this.regions.push(region);
                    if (!isPassThrough(geom.segmentMidpoint(currentEdge),
                                        this.source, this.polygon)) {
                        this.regions.push(this.makeOneRegion(currentEdge));
                    }
                } else {
                    console.log("rejected", currentVertex);
                }
                currentVertex = currentEdge.end;
                currentEdge = this.polygon.nextEdge(currentVertex);
            }
        },

        makeOneRegion: function (source) {
            return new ShortestPathRegion(this.source, source, this.polygon);
        },

        displayPassThroughRegion: function () {
            var i = 0;
            var direction;
            var lastRegion = this.regions[this.regions.length - 1];
            for (; i < this.regions.length; ++i) {
                if (this.regions[i].isTangentRegion()) {
                    // Go in the direction AWAY from the other point
                    if ((i === 0 && lastRegion.isTangentRegion()) ||
                            this.regions[i - 1].isTangentRegion()) {
                        direction = 1;
                    } else {
                        direction = -1;
                    }
                    break;
                }
            }
            // Add first tangent bound
            do { // Go in circle from last back to first
                i += direction;
                while (i < 0) i += boxPoints.length;
                i %= boxPoints.length;
                // Add each edge's bound
                points.push(boxPoints[i]);
            } while (!this.regions[i].isTangentRegion());
            // Add last tangent bound
            // All bounds should have an opposite direction
        },

        shortestPathTo: function (dest) {
            var region = _.find(this.regions, function (region) {
                return region.pointWithin(dest);
            }, this)
        }

    });

    return LastStepShortestPathMap;
});
