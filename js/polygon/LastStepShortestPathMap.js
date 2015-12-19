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

    function isPassThrough(point, source, polygon) {
        var segment = {
            start: source,
            end: point
        };
        return polygon.segmentIntersects(segment);
    }


    var ShortestPathRegion = declare([UnboundedRegion], {

        passthroughRegionColor: [0, 191, 255, 0.50],
        pointRegionColor: [255, 0, 0, 0.50],
        edgeRegionColor: [124, 252, 0, 0.50],

        constructor: function (start, source, polygon) {
            this.start = start;
            this.polygon = polygon;
            this.tangent = null;
            this.angleSum = 0;
            this._setSource(source);
            this._makeBounds(start, source);
        },

        _setSource: function (source) {
            this.source = source;
            if (_.isFinite(source.x) && _.isFinite(source.y)) {
                this.type = "point";
            } else if (source.start && source.end) {
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

            this.bounds = bounds;
            if (this.type === "point") {
                this.wide = this._isReflex();
            }
        },

        color: function () {
            return this[this.type + "RegionColor"];
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
                direction = -geom.sideOfLine(otherPoint, slope, intercept);
                this.tangent = new HalfPlane(slope, intercept, direction);
                //this.angleSum += Math.PI/2;
                return this.tangent;
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

        _getCenter: function () {
            if (this.type === "edge") {
                return geom.segmentMidpoint(this.source);
            } else if (this.type === "point") {
                return this.source;
            }
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
            return !!this.tangent;
        }
    });


    
    var LastStepShortestPathMap = declare(null, {

        colors: {
            passthrough: [0, 191, 255, 0.50],
            point: [255, 0, 0, 0.50],
            edge: [124, 252, 0, 0.50],
        },

        constructor: function (source, polygon, previousMaps) {
            previousMaps = previousMaps || [];
            this.previousMaps = _.clone(previousMaps);
            this.source = source;
            this.polygon = polygon;
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
            this.regions.push(this.buildPassThroughRegion());
        },

        makeOneRegion: function (source) {
            return new ShortestPathRegion(this.source, source, this.polygon);
        },

        displayRegions: function (surface, type) {
            function rightType(region) {
                return !type || type === region.type;
            }
            var regions = _.filter(this.regions, rightType, this);
            return _.map(regions, function (region) {
                var color = this.colorOf(region);
                return region.drawTo(surface, color);
            }, this);
        },
/*
        displayPassThroughRegion: function (surface) {
            if (!this.passThroughRegion) {
                this.buildPassThroughRegion();
            }
            return this.passThroughRegion.drawTo(surface, this.passthroughRegionColor);
        },
*/
        buildPassThroughRegion: function () {
            var i = 0;
            var direction;
            var lastRegion = this.regions[this.regions.length - 1];
            for (; i < this.regions.length; ++i) {
                if (this.regions[i].isTangentRegion()) {
                    // Go in the direction AWAY from the other point
                    if (i === 0 && lastRegion.isTangentRegion()) {
                        direction = 1;
                    } else if (i !== 0 && this.regions[i - 1].isTangentRegion()) {
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

            var passThroughRegion = new UnboundedRegion();
            passThroughRegion.type = "passthrough";
            // Add first tangent bound
            passThroughRegion.addBounds(this.regions[i].tangent.flipped());
            i = increment(i, direction, this.regions.length);
            while (!this.regions[i].isTangentRegion()) { // Go in circle from last back to first
                // Add each edge's bound
                if (this.regions[i].type === "edge") {
                    passThroughRegion.addBounds(this.regions[i].bounds[1].flipped());
                }
                i = increment(i, direction, this.regions.length);
            }
            passThroughRegion.addBounds(this.regions[i].tangent.flipped());
            return this.passThroughRegion = passThroughRegion;
        },

        colorOf: function (region) {
            return this.colors[region.type];
        },

        shortestPathTo: function (dest) {
            var region = _.find(this.regions, function (region) {
                return region.pointWithin(dest);
            }, this)
        }

    });

    return LastStepShortestPathMap;
});
