define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojox/gfx",
        "dojox/gfx/Moveable",
        "polygon/LastStepShortestPathMap",
        "util/EventQueue",
        "lib/lodash"
    ], function (
        declare,
        lang,
        gfx,
        Moveable,
        LastStepShortestPathMap,
        EventQueue,
        _
    ) {


    /**
     *  @class
     *  @name  Canvas
     */
    var PathFinder = declare(null, {

        constructor: function () {
            this.polygons = [];
            this.steps = new EventQueue();
            this.started = false;
        },

        services: function () {
            return [
                {name: "getSurface", source: "getSurface"},
                {name: "newMessage", source:"newMessage"},
                {name: "setButtonText", source: "changeButtonText"}
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
            // Drop the first polygons that have start point in it, explain why
            var self = this;
            var polygons = this.filterPolygons();
            var maps = [];
            _.each(polygons, function (polygon) {
                maps.push(this.constructMap(polygon, maps));
            }, this);
            self.steps.enqueue(function (finished) {
                self.newMessage("vertexRegionExplanation.html");
                var shortestPath = _.last(maps).shortestPathTo(self.endPoint); // Or straight line
                shortestPath = _.map(shortestPath, function (point) {
                    return {x: point.x, y: point.y}; // Filter out unneeded properties
                }, this);
                self.getSurface().createPolyline(shortestPath).setStroke("blue");
                self.setButtonText("");
                self._nextStep = finished;
            });
            this.started = true;
        },

        constructMap: function (polygon, maps) {
            var self = this;
            var map = new LastStepShortestPathMap(this.startPoint, polygon, maps,
                                                    this.getSurface());
            var regions;
            self.steps.enqueue(function (finished) {
                regions = map.displayRegions(self.getSurface(), "passthrough");
                self.newMessage("passthroughExplanation.html");
                self.setButtonText("Next Region Type");
                self._nextStep = finished;
            });
            self.steps.enqueue(function (finished) {
                regions = regions.concat(map.displayRegions(self.getSurface(), "edge"));
                self.newMessage("edgeRegionExplanation.html");
                self._nextStep = finished;
            });
            self.steps.enqueue(function (finished) {
                regions = regions.concat(map.displayRegions(self.getSurface(), "point"));
                self.newMessage("vertexRegionExplanation.html");
                // If last polygon
                self.setButtonText("Construct the Path");
                self._nextStep = finished;
                console.log(regions);
            });
            self.steps.enqueue(function (finished) {
                _.each(regions, function (region) {
                    region.removeShape();
                }, this);
                finished();
            }, this);
            return map;
        },

        filterPolygons: function () {
            var self = this;
            var split = _.groupBy(this.polygons, function (polygon) {
                if (polygon.pointIn(this.startPoint) ||
                        polygon.pointIn(this.endPoint)) {
                    return "containsEndpoints";
                } else if (!polygon.hasProperty("convex")) {
                    return "nonConvex";
                } else {
                    return "unfiltered";
                }
            }, this);
            if (split["unfiltered"]) {
                self.steps.enqueue(function (finished) {
                    self.newMessage("overview.html");
                    if (split["unfiltered"].length === self.polygons.length) {
                        self.setButtonText("Start With the First Polygon");
                    } else {
                        self.setButtonText("Filter Out Unneeded Polygons");
                    }
                    self._nextStep = finished;
                });
            }
            if (split["nonConvex"]) {
                self.steps.enqueue(function (finished) {
                    self.newMessage("filterNonConvex.html");
                    if (split["containsEndpoints"]) {
                        self.setButtonText("Filter Some More Polygons");
                    } else if (split["unfiltered"]) {
                        self.setButtonText("Start With the First Polygon");
                    } else {
                        self.setButtonText("Construct the Path");
                    }
                    self._nextStep = finished;
                });
            }
            if (split["containsEndpoints"]) {
                self.steps.enqueue(function (finished) {
                    self.newMessage("filterContainsEndpoints.html");
                    if (split["unfiltered"]) {
                        self.setButtonText("Start With the First Polygon");
                    } else {
                        self.setButtonText("Construct the Path");
                    }
                    self._nextStep = finished;
                });
            }
            console.log(split);
            return split["unfiltered"] || [];
        },

        onNextStepReady: function () {
            if (!this.started) {
                this.startConstruction();
            } else {
                this._nextStep();
            }
        },

        _nextStep: function () {
            console.error("NO NEXT STEP AVAILABLE");
        },

        onNewPolygon: function (polygon) {
            this.polygons.push(polygon);
        }

    });

    return PathFinder;
});
