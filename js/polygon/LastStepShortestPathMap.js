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

    var ShortestPathRegion = declare(null, {
        constructor: function (start, source, polygon) {
            this.polygon = polygon;
            this.tangent = false;
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
            } else if (this.type == "edge") {
                bounds = [this._halfPlaneAt(start, source.start, source),
                          this._halfPlaneFromSegment(source),
                          this._halfPlaneAt(start, source.end, source)];
            }
            // Bounds should be HalfPlanes
            // If edge, make into halfplane, add
            // Direction based on where the rest of the polygon is
            this.bounds = bounds;
            _.each(bounds, function (bound) {
                if (bound) {
                    bound.asLineOn(surface);
                }
            }, this);
        },

        _halfPlaneAt: function (start, point, edge) {
            var segment = {
                start: start,
                end: point
            };
            var otherPoint = edge.start;
            if (otherPoint === point) {
                otherPoint = edge.end;
            }
            if (this.polygon.isSegmentTangent(segment) &&
                isPassThrough(geom.segmentMidpoint(edge), start, this.polygon)) {
                this.tangent = true;
                var slope = geom.segmentSlope(segment);
                var intercept = geom.segmentIntercept(segment, slope);
                var direction = -geom.sideOfLine(otherPoint, slope, intercept);
                return new HalfPlane(slope, intercept, direction);
            }
            // If tangent && other vertex pass-through, then just extend the line, else...
            // Reflect start over intercept
            // Make segment from start to point, extend to line
            // Direction is...???  other side from edge's other endpoint?
            // And opposite if this.type is edge
        },

        _halfPlaneFromSegment: function (segment) {
            var slope = geom.segmentSlope(segment);
            var intercept = geom.segmentIntercept(segment, slope);
            var polygonQueryPoint = _.find(this.polygon.vertices, function (v) {
                return v !== segment.start && v !== segment.end;
            }, this);
            var direction = geom.sideOfLine(polygonQueryPoint, slope, intercept);
            return new HalfPlane(slope, intercept, direction);
        },

        isTangentRegion: function () {
            //console.log(this.tangent);
            return this.tangent;
        },

        pointWithin: function (point) {
            return _.all(this.bounds, function (bound) {
                return bound.onCorrectSide(point);
            }, this);
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
            }
            currentVertex = currentEdge.end;
            currentEdge = this.polygon.nextEdge(currentVertex);
            console.log("-------------");
            while (currentVertex !== first) {
                if (!isPassThrough(currentVertex, this.source, this.polygon)) {
                    region = this.makeOneRegion(currentVertex);
                    this.regions.push(region);
                    if (!isPassThrough(geom.segmentMidpoint(currentEdge),
                                        this.source, this.polygon)) {
                        this.regions.push(this.makeOneRegion(currentEdge));
                    }
                }
                currentVertex = currentEdge.end;
                currentEdge = this.polygon.nextEdge(currentVertex);
            }
        },

        makeOneRegion: function (source) {
            return new ShortestPathRegion(this.source, source, this.polygon);
        },

        shortestPathTo: function (dest) {
            var region = _.find(this.regions, function (region) {
                return region.pointWithin(dest);
            }, this)
        }

    });

    return LastStepShortestPathMap;
});
