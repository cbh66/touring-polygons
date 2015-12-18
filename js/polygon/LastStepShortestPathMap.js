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
                // Check if angle is over 180 or something?
                // Behavior will have to change for particularly wide cones
                // That's if the other halfplane's endpoint is in bounds?  The wrong one?
            } else if (this.type == "edge") {
                bounds = [this._halfPlaneAt(start, source.start, source),
                          this._halfPlaneFromSegment(source),
                          this._halfPlaneAt(start, source.end, source)];
            }

            this.bounds = bounds;
            _.each(bounds, function (bound) {
                if (bound) {
                    //bound.asLineOn(surface);
                }
            }, this);
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
            if (this.polygon.isSegmentTangent(segment) &&
                    isPassThrough(geom.segmentMidpoint(edge), start, this.polygon)) {
                slope = geom.segmentSlope(segment);
                intercept = geom.segmentIntercept(segment, slope);
                this.tangent = true;
                direction = -geom.sideOfLine(otherPoint, slope, intercept);
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

        drawTo: function (surface) {
            var width = surface.width || surface.rawNode.width.animVal.value;
            var height = surface.height || surface.rawNode.height.animVal.value;
            var current = this.bounds[0];
            var segment = geom.lineToSegment(current.slope, current.intercept, {
                l: -width, w: 2*width, t: -height, h: 2*height
            });
            var prevPoint;
            function startOnCorrectSide(bound) {
                if (bound === current) return true;
                return bound.onCorrectSide(segment.start);
            }
            if (_.all(this.bounds, startOnCorrectSide, this)) {
                prevPoint = segment.start;
                console.log("TRUE");
            } else {
                prevPoint = segment.end;
                console.log("FALSE");
            }

            for (var i = 1; i < this.bounds.length; ++i) {
                current = this.bounds[i - 1];
                var intersection = geom.lineIntersectionPoint(current.slope, current.intercept,
                                            this.bounds[i].slope, this.bounds[i].intercept);
                console.log(surface.createLine({
                    x1: prevPoint.x,
                    y1: prevPoint.y,
                    x2: intersection.x,
                    y2: intersection.y
                }).setStroke("red"));
                prevPoint = intersection;
            }

            current = this.bounds[this.bounds.length - 1];
            var segment = geom.lineToSegment(current.slope, current.intercept, {
                l: -width, w: 2*width, t: -height, h: 2*height
            });
            if (_.all(this.bounds, startOnCorrectSide, this)) {
                intersection = segment.start;
                console.log("TRUE");
            } else {
                intersection = segment.end;
                console.log("FALSE");
            }
            console.log(surface.createLine({
                x1: prevPoint.x,
                y1: prevPoint.y,
                x2: intersection.x,
                y2: intersection.y
            }).setStroke("red"));
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
