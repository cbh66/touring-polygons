define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/Stateful",
        "dojox/gfx",
        "dojox/gfx/Moveable",
        "util/geom",
        "lib/lodash"
    ], function (
        declare,
        lang,
        Stateful,
        gfx,
        Moveable,
        geom,
        _
    ) {

    // Set moveable.  On true, give everything a moveable.  On false, call m.destroy()

    /**
     *  @class
     *  @name  Polygon
     */
    var Polygon = declare([Stateful], {

        constructor: function (surface, args) {
            args = args || {};
            this.closed = false;
            this.surface = surface;
            this.vertices = [];
            this.edges = [];
            this.pointCallbacks = {};  // Integer keys, array of function values
            this._edgeStroke = {};
            this._vertexStroke = {};
            this._zIndices = {
                edge: 0,
                vertex: 1
            };
            this.properties = {
                "simple": {  // Only care about simple, convex for now
                    is: true
                },
                "convex": {
                    is: true,
                    direction: ""
                },
                "weakly simple": {
                    is: true
                },
                "regular": {
                    is: true,
                    angle: 0
                },
                "concave": {
                    is: false
                },
                "self-intersecting": {
                    is: false,
                    edges: []
                }
            };
            this.propertiesCallbacks = []; // Obj elements,
                                           // keys active, properties, onAcquire, onLoss

            this._edgeColorSetter(args.edgeColor || "green");
            this._vertexFillSetter(args.vertexFill || "yellow");
            this._vertexOutlineSetter(args.vertexOutline || "blue");
            this._vertexRadiusSetter(args.vertexRadius || 5);
            this._edgeWidthSetter(args.edgeWidth || 1);
            this._setDefaultListeners();
        },

        hasProperty: function (prop) {
            prop = this.properties[prop];
            return !!prop && prop.is;
        },

        _setDefaultListeners: function () {
            this.onPointCreate(function (point) {
                var newEdge = this.prevEdge(point);
                return;
                if (this.properties.simple.is) {
                    var intersects = _.any(this.edges, function (edge) {
                        return (edge != newEdge) && geom.intersects(edge, newEdge);
                    }, this);
                    this.properties.simple.is = !intersects;
                }
            });
        },

        setVertexStroke: function (type, value) {
            this._vertexStroke = this._setStroke(type, value, this._vertexStroke);
            this._setVerticesStroke();
        },

        setEdgeStroke: function (type, value) {
            this._edgeStroke = this._setStroke(type, value, this._edgeStroke);
            this._setEdgesStroke();
        },

        _setStroke: function (type, value, original) {
            var stroke = {};
            if (arguments.length == 1) {
                stroke = type;
            } else if (_.isArray(type)) {
                var getValue;
                if (_.isArray(value) && value.length > 0) {
                    getValue = function (index) {
                        if (index >= value.length) {
                            index = value.length - 1;
                        } else if (index < 0) {
                            index = 0;
                        }
                        return value[index];
                    };
                } else {
                    getValue = function () {return value;};
                }
                _.each(type, function (name, index) {
                    stroke[name] = getValue(index);
                }, this);
            } else {
                stroke[type] = value;
            }
            return _.assign(original, stroke);
        },

        _setVerticesStroke: function () {
            _.each(this.vertices, function (vertex) {
                vertex.setStroke(this._vertexStroke);
            }, this);
        },

        _setEdgesStroke: function () {
            _.each(this.edges, function (edge) {
                edge.setStroke(this._edgeStroke);
            }, this);
        },

        _vertexFillSetter: function (color) {
            _.each(this.vertices, function (vertex) {
                vertex.setFill(color);
            }, this);
            this.vertexFill = color;
        },

        _vertexOutlineSetter: function (color) {
            this._vertexStroke.color = color;
            this._setVerticesStroke();
        },

        _vertexRadiusSetter: function (radius) {
            this.vertexRadius = radius;
        },

        _vertexZIndexSetter: function (num) {
            this._zIndices.vertex = num;
            if (this._zIndices.vertex > this._zIndices.edge) {
                _.each(this.vertices, function (vertex) {
                    edge.moveToFront();
                }, this);
            }
        },

        _edgeWidthSetter: function (width) {
            if (width > 0) {
                this._edgeStroke.width = width;
                this._setEdgesStroke();
            }
        },

        _edgeColorSetter: function (color) {
            this._edgeStroke.color = color;
            this._setEdgesStroke();
        },

        _edgeZIndexSetter: function (num) {
            this._zIndices.edge = num;
            if (this._zIndices.edge > this._zIndices.vertex) {
                _.each(this.edges, function (edge) {
                    edge.moveToFront();
                }, this);
            }
        },

        onPointCreate: function (index, callback) { // -1 will be called when polygon is closed
            var key = index;
            if (arguments.length == 1) {
                key = "any";
                callback = arguments[0];
            }
            this.pointCallbacks[key] = this.pointCallbacks[key] || [];
            this.pointCallbacks[key].push(callback);
        },

        onPointMove: function (callback) {
            this.pointCallbacks["move"] = this.pointCallbacks["move"] || [];
            this.pointCallbacks["move"].push(callback);
        },

        nextEdge: function (vertex) {
            if (!_.isFinite(vertex)) {
                vertex = _.indexOf(this.vertices, vertex);
            }
            if (vertex < 0 || this.vertices.length <= vertex) {
                return null;
            }
            return this.edges[vertex];
        },

        prevEdge: function (vertex) {
            if (!_.isFinite(vertex)) {
                vertex = _.indexOf(this.vertices, vertex);
            }
            if (vertex < 0 || this.vertices.length <= vertex) {
                return null;
            }
            var prev = vertex - 1;
            if (prev < 0) {
                prev += this.edges.length;
            }
            return this.edges[prev];
        },

        nextVertex: function (vertex) {
            if (!_.isFinite(vertex)) {
                vertex = _.indexOf(this.vertices, vertex);
            }
            if (vertex < 0 || this.vertices.length <= vertex) {
                return null;
            }
            return this.vertices[(vertex + 1) % this.vertices.length];
        },

        prevVertex: function (vertex) {
            if (!_.isFinite(vertex)) {
                vertex = _.indexOf(this.vertices, vertex);
            }
            if (vertex < 0 || this.vertices.length <= vertex) {
                return null;
            }
            var prev = vertex - 1;
            if (prev < 0) {
                prev += this.vertices.length;
            }
            return this.vertices[prev];
        },

        _makeEdgeBetween: function (v1, v2) {
            var newEdge = this.surface.createLine({
                x1: v1.shape.cx,
                y1: v1.shape.cy,
                x2: v2.shape.cx,
                y2: v2.shape.cy
            }).setStroke(this._edgeStroke);
            if (this._zIndices.edge < this._zIndices.vertex) {
                newEdge.moveToBack();
            }
            newEdge.start = v1;
            newEdge.end = v2;
            return newEdge;
        },

        _pointCreated: function (index, point) {
            this._updateProps(index, point);

            var callbacks = this.pointCallbacks[index] || [];
            _.each(callbacks, function (callback) {
                callback.call(this, point, index);
            }, this);
            _.each(this.pointCallbacks.any, function (callback) {
                callback.call(this, point, index);
            }, this);
        },

        _pointMoved: function (point) {
            _.each(this.pointCallbacks["move"], function (callback) {
                callback.call(this, point);
            }, this);
        },

        preventMove: function () {
            _.each(this.vertices, function (point) {
                point.mover.destroy();
                point.mover = null;
                console.log(point);
            }, this);
        },

        _movePoint: function (mover, shift) {
            var point = mover.shape;
            var nextEdge = this.nextEdge(point);
            var prevEdge = this.prevEdge(point);
            var nextEdgeI = _.indexOf(this.edges, nextEdge);
            var prevEdgeI = _.indexOf(this.edges, prevEdge);
            var pointI = _.indexOf(this.vertices, point);

            point.x = point.shape.cx += shift.dx;
            point.y = point.shape.cy += shift.dy;
            if (nextEdge) {
                this.edges[nextEdgeI] = this._makeEdgeBetween(point,
                    this.nextVertex(point));
            }
            if (prevEdge) {
                this.edges[prevEdgeI] = this._makeEdgeBetween(this.prevVertex(point),
                    point);
            }

            if (this.properties["simple"].is) {
                if ((nextEdge && this.segmentIntersects(this.edges[nextEdgeI])) ||
                    (prevEdge && this.segmentIntersects(this.edges[prevEdgeI]))) {
                    this.properties["self-intersecting"].is = true;
                    this.properties["simple"].is = false;
                }
            } else {
                var simple = _.all(this.edges, _.negate(this.segmentIntersects), this);
                if (simple) {
                    this.properties["self-intersecting"].is = false;
                    this.properties["simple"].is = true;
                }
            }
            var convex = this.properties["simple"].is && this._isConvex(this.vertices);
            this.properties["convex"].is = convex;

            if (nextEdge) {
                nextEdge.removeShape();
            }
            if (prevEdge) {
                prevEdge.removeShape();
            }
            this._onPropertyChange();
            this._pointMoved(point);
        },

        addPoint: function (properties) {
            var self = this;
            if (this.closed) {
                return null;
            }
            var newPoint = this.surface.createCircle({
                cx: properties.x,
                cy: properties.y,
                r: this.vertexRadius
            }).setFill(this.vertexFill).setStroke(this._vertexStroke);
            newPoint.mover = new Moveable(newPoint);
            newPoint.mover.onMoved = lang.hitch(this, this._movePoint);

            if (this.vertices.length > 0) {
                var prevPoint = this.vertices[this.vertices.length - 1];
                var newEdge = this._makeEdgeBetween(prevPoint, newPoint);
                this.edges.push(newEdge);
            }
            newPoint.x = properties.x;
            newPoint.y = properties.y;
            this.vertices.push(newPoint);
            this._pointCreated(this.vertices.length - 1, newPoint);
            return newPoint;
        },

        close: function () {
            var firstPoint = this.vertices[0];
            var lastPoint = this.vertices[this.vertices.length - 1];
            var newEdge = this._makeEdgeBetween(lastPoint, firstPoint);

            this.edges.push(newEdge);
            this.closed = true;
            this._pointCreated(-1, firstPoint);
        },

        move: function (vertex, location) {
            console.log(vertex);
        },

        onProperties: function (props, onAcquire, onLoss) { // props can be obj w t/f vals or arr
            onLoss = onLoss || _.noop;
            if (!_.isPlainObject(props)) {
                if (!_.isArray(props)) {
                    props = [props];
                }
                props = _.reduce(props, function (obj, prop) {
                    obj[prop] = true;
                    return obj;
                }, {});
            }
            var newCallback = {
                active: false,
                properties: props,
                onAcquire: onAcquire,
                onLoss: onLoss
            };
            this._evaluate(newCallback);
            this.propertiesCallbacks.push(newCallback);
        },


        lineIntersects: function (slope, intercept, includeEndpoints) {
            var endPointOnEdge;
            if (!includeEndpoints) {
                 endPointOnLine = function (edge) {
                    return geom.pointOnLine(edge.start, slope, intercept) ||
                            geom.pointOnLine(edge.end, slope, intercept);
                }
            } else {
                endPointOnEdge = _.constant(false);
            }
            return _.any(this.edges, function (edge) {
                if (endPointOnLine(edge)) {
                    return false;
                }
                var edgeSlope = geom.segmentSlope(edge);
                var edgeIntercept = geom.segmentIntercept(edge, edgeSlope);
                var intersection = geom.lineIntersectionPoint(edgeSlope, edgeIntercept,
                                                                slope, intercept);
                return intersection && (intersection === Infinity ||
                        geom.pointOnSegment(intersection, edge));
            }, this);
        },

        segmentIntersects: function (testEdge, includeEndpoints) {
            var endPointOnEdge;
            if (!includeEndpoints) {
                 endPointOnEdge = function (edge1, edge2) {
                    return geom.pointOnSegment(edge1.start, edge2) ||
                            geom.pointOnSegment(edge1.end, edge2) ||
                            geom.pointOnSegment(edge2.start, edge1) ||
                            geom.pointOnSegment(edge2.end, edge1);
                }
            } else {
                endPointOnEdge = _.constant(false);
            }
            return _.any(this.edges, function (edge) {
                return !endPointOnEdge(edge, testEdge) &&
                        geom.segmentsIntersect(edge, testEdge);
            }, this);
        },

        isSegmentTangent: function (segment) {
            var slope = geom.segmentSlope(segment);
            var intercept = geom.segmentIntercept(segment);
            var point = _.find(this.vertices, function (v) {
                return geom.pointOnLine(v, slope, intercept);
            }, this);
            if (!point) {
                return false;
            }
            return !_.any(this.edges, function (edge) {
                var otherSlope = geom.segmentSlope(edge);
                var otherIntercept = geom.segmentIntercept(edge);
                var intersection = geom.lineIntersectionPoint(slope, intercept,
                                                    otherSlope, otherIntercept);
                var xMin = Math.min(edge.start.x, edge.end.x);
                var xMax = Math.max(edge.start.x, edge.end.x);
                var yMin = Math.min(edge.start.y, edge.end.y);
                var yMax = Math.max(edge.start.y, edge.end.y);
                return edge.start !== point && edge.end !== point && intersection &&
                        (intersection === Infinity ||
                            xMin <= intersection.x && intersection.x <= xMax &&
                            yMin <= intersection.y && intersection.y <= yMax);
            }, this);
        },

        pointIn: function (point) {
            var xMin = _.min(this.vertices, "x").x;
            var xMax = _.max(this.vertices, "x").x;
            var segment = {    // Horizontal line from the point to outside polygon
                start: point,
                end: {
                    x: point.x + 2*(xMax - point.x),
                    y: point.y
                }
            };
            function countIntersection(edge) {
                var intersection = geom.segmentsIntersect(segment, edge);
                return (intersection && intersection !== Infinity) ? 1 : 0;
            }
            return xMin <= point.x && point.x <= xMax &&
                _.sum(this.edges, countIntersection, this) % 2 === 1;
        },

        _isConvex: function (vertices) {
            if (vertices.length < 4) {
                return true;
            }
            function zCrossProduct(index) {
                var i2 = (index + 2) % vertices.length;
                var i1 = (index + 1) % vertices.length;
                var dx1 = vertices[i2].x - vertices[i1].x;
                var dy1 = vertices[i2].y - vertices[i1].y;
                var dx2 = vertices[i1].x - vertices[index].x;
                var dy2 = vertices[i1].y - vertices[index].y;
                return dx1*dy2 - dy1*dx2;
            }
            var sign = zCrossProduct(0) > 0;
            return _.all(vertices, function (v, i) {
                return sign == zCrossProduct(i) > 0;
            }, this);
        },

        _updateProps: function (index, point) {
            var prevEdge = this.prevEdge(index);
            var nextEdge = this.nextEdge(index);
            if (prevEdge) {
                if (this.properties["simple"].is && this.segmentIntersects(prevEdge)) {
                    this.properties["self-intersecting"].is = true;
                    this.properties["simple"].is = false;
                }
            }
            var convex = this.properties["simple"].is && this._isConvex(this.vertices);
            this.properties["convex"].is = convex;
            this._onPropertyChange();
        },

        _onPropertyChange: function () {
            _.each(this.propertiesCallbacks, this._evaluate, this);
        },

        _evaluate: function (callbackObj) {
            var satisfied = _.all(callbackObj.properties, function (prop, name) {
                return prop === this.properties[name].is;
            }, this);
            if (satisfied !== callbackObj.active) {
                if (!callbackObj.active) {
                    callbackObj.onAcquire();
                } else {
                    callbackObj.onLoss();
                }
                callbackObj.active = satisfied;
            }
        }
    });

    return Polygon;
});
