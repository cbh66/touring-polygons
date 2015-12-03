define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojox/gfx",
        "dojox/gfx/Moveable",
        "lib/lodash"
    ], function (
        declare,
        lang,
        gfx,
        Moveable,
        _
    ) {


    /**
     *  @class
     *  @name  Polygon
     */
    var Polygon = declare(null, {

        constructor: function (surface) {
            this.closed = false;
            this.surface = surface;
            this.vertices = [];
            this.edges = [];
            this.pointCallbacks = {};  // Integer keys, array of function values
        },

        onPointCreate: function (index, callback) {
            this.pointCallbacks[index] = this.pointCallbacks[index] || [];
            this.pointCallbacks[index].push(callback);
        },

        _onPointCreate: function (index, point) {
            var callbacks = this.pointCallbacks[index] || [];
            _.each(callbacks, function (callback) {
                callback.call(this, point);
            }, this);
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
            }).setStroke("green");
            return newEdge;
        },

        addPoint: function (properties) {
            var self = this;
            if (this.closed) {
                return null;
            }
            var newPoint = this.surface.createCircle({
                cx: properties.x,
                cy: properties.y,
                r: 5
            }).setFill("yellow").setStroke("blue");
            var m = new Moveable(newPoint);
            m.onMoved = function (mover, shift) {
                var point = m.shape;
                var nextEdge = self.nextEdge(newPoint);
                var prevEdge = self.prevEdge(newPoint);
                var nextEdgeI = _.indexOf(self.edges, nextEdge);
                var prevEdgeI = _.indexOf(self.edges, prevEdge);

                point.shape.cx += shift.dx;
                point.shape.cy += shift.dy;
                self.edges[nextEdgeI] = self._makeEdgeBetween(point,
                        self.nextVertex(newPoint));
                self.edges[prevEdgeI] = self._makeEdgeBetween(self.prevVertex(newPoint),
                        point);

                nextEdge.removeShape();
                prevEdge.removeShape();
            }

            if (this.vertices.length > 0) {
                var prevPoint = this.vertices[this.vertices.length - 1];
                var newEdge = this._makeEdgeBetween(prevPoint, newPoint);
                this.edges.push(newEdge);
            }

            this.vertices.push(newPoint);
            this._onPointCreate(this.vertices.length - 1, newPoint);
            return newPoint;
        },

        close: function () {
            var firstPoint = this.vertices[0];
            var lastPoint = this.vertices[this.vertices.length - 1];
            var newEdge = this._makeEdgeBetween(lastPoint, firstPoint);
            console.log("closed");

            this.edges.push(newEdge);
            this.closed = true;
        },

        move: function (vertex, location) {
            console.log(vertex);
        }
    });

    return Polygon;
});
