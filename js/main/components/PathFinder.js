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

        events: function () {
            return [
                {name: "preventInteraction", source: "preventInteraction"},
                {name: "quickPath", source: "quickPath"}
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
            var surface = this.getSurface();
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

        preventEndpointMoving: function () {
            this.startPointMover.destroy();
            this.endPointMover.destroy();
        },

        togglePath: function () {
            if (this.pathShape) {
                this.pathShape.removeShape();
                this.pathShape = null;
            } else {
                this.pathShape = this.displayPath();
            }
        },

        displayPath: function () {
            var maps = [];
            var polygons = this.filterPolygons(true);
            function makePath(endpoint, map) {
                var shortestPath;
                if (map) {
                    shortestPath = map.shortestPathTo(endpoint);
                } else {
                    shortestPath = [this.startPoint, endpoint];
                }
                shortestPath = _.map(shortestPath, function (point) {
                    return {x: point.x, y: point.y}; // Filter out unneeded properties
                }, this);
                return this.getSurface().createPolyline(shortestPath).setStroke("blue");
            }
            _.each(polygons, function (polygon) {
                maps.push(new LastStepShortestPathMap(this.startPoint, polygon, maps));
            }, this);
            return makePath.call(this, this.endPoint, _.last(maps));
        },

        startConstruction: function () {
            // Drop the first polygons that have start point in it, explain why
            var self = this;
            var polygons = this.filterPolygons();
            var maps = [];

            function beforePath(finished) {
                self.newMessage("pathConstruction.html");
                self.setButtonText("Show the Path");
                self._nextStep = finished;
            };
            function makeMap(index) {
                var newMap;
                var polygon = polygons[index];
                var paths;
                if (index === 1) {
                    self.steps.enqueue(function (finished) {
                        self.newMessage("secondPolygonOverview.html");
                        self.setButtonText("Calculate Paths to Each Vertex");
                        self._nextStep = finished;
                    });
                } else if (index === 2) {
                    self.steps.enqueue(function (finished) {
                        self.newMessage("thirdPolygonOverview.html");
                        self.setButtonText("Calculate Paths to Each Vertex");
                        self._nextStep = finished;
                    });
                }
                self.steps.enqueue(function (finished) {
                    paths = _.map(polygon.vertices, function (vertex) {
                        return makePath(vertex, maps[index - 1]);
                    }, self);
                    if (index === 0) {
                        self.newMessage("firstPaths.html");
                    } else if (index === 1) {
                        self.newMessage("secondPaths.html");
                    } else {
                        self.newMessage("lastPaths.html");
                    }
                    self.setButtonText("Calculate Regions");
                    self._nextStep = finished;
                });
                if (index === 0) {
                    if (index < polygons.length - 1) {
                        newMap = self.constructFirstMap(polygon, "Next Region",
                                                            "Next Polygon");
                    } else {
                        newMap = self.constructFirstMap(polygon, "Next Region",
                                                            "Construct the Path", beforePath);
                    }
                } else if (index < polygons.length - 1) {
                    newMap = self.constructMiddleMap(polygon, maps, "Next Region", "Next Polygon");
                } else {
                    newMap = self.constructLastMap(polygon, maps, "Next Region",
                                                "Construct the Path", beforePath);
                }
                self.steps.enqueue(function (finished) {
                    _.each(paths, function (path) {
                        path.removeShape();
                    }, self);
                    finished();
                });
                maps.push(newMap);
                addNextStep(index + 1);
            }
            function makePath(endpoint, map) {
                var shortestPath;
                if (map) {
                    shortestPath = map.shortestPathTo(endpoint);
                } else {
                    shortestPath = [self.startPoint, endpoint];
                }
                shortestPath = _.map(shortestPath, function (point) {
                    return {x: point.x, y: point.y}; // Filter out unneeded properties
                }, this);
                return self.getSurface().createPolyline(shortestPath).setStroke("blue");
            }
            function addNextStep(index) {
                if (index < polygons.length) {
                    self.steps.enqueue(function (finished) {
                        makeMap(index);
                        finished();
                    });
                } else {
                    self.steps.enqueue(function (finished) {
                        if (!self.pathShape) {
                            self.quickPath();
                            //this.pathShape = makePath(self.endPoint, _.last(maps));
                        }
                        self.setButtonText("How Long Does it Take?");
                        self._nextStep = finished;
                    });
                    self.steps.enqueue(function (finished) {
                        self.newMessage("timeComplexity.html");
                        self.setButtonText("Start Over");
                        self._nextStep = function () {
                            window.location.reload();
                        };
                        finished();
                    });
                }
            }
            this.started = true;
            addNextStep(0);
        },

        constructFirstMap: function (polygon, midButtonText, endingButtonText, beforeRemoval) {
            var self = this;
            var map = new LastStepShortestPathMap(this.startPoint, polygon, [],
                                                    this.getSurface());
            var regions = [];
            self.steps.enqueue(this.displayRegion(map, regions, "passthrough",
                                "passthroughExplanation.html", midButtonText));
            self.steps.enqueue(this.displayRegion(map, regions, "edge",
                                "edgeRegionExplanation.html", midButtonText));
            self.steps.enqueue(this.displayRegion(map, regions, "point",
                                "vertexRegionExplanation.html", endingButtonText));
            if (_.isFunction(beforeRemoval)){
                self.steps.enqueue(beforeRemoval);
            }
            self.steps.enqueue(function (finished) {
                _.each(regions, function (region) {
                    region.removeShape();
                }, this);
                finished();
            }, this);
            return map;
        },

        constructMiddleMap: function (polygon, maps, midButtonText, endingButtonText) {
            var self = this;
            var map = new LastStepShortestPathMap(this.startPoint, polygon, maps,
                                                    this.getSurface());
            var regions = [];
            self.steps.enqueue(this.displayRegion(map, regions, "passthrough",
                                "passthroughBrief.html", midButtonText));
            self.steps.enqueue(this.displayRegion(map, regions, "edge",
                                "edgeBrief.html", midButtonText));
            self.steps.enqueue(this.displayRegion(map, regions, "point",
                                "vertexBrief.html", endingButtonText));
            self.steps.enqueue(function (finished) {
                _.each(regions, function (region) {
                    region.removeShape();
                }, this);
                finished();
            }, this);
            return map;
        },

        constructLastMap: function (polygon, maps, midButtonText, endingButtonText, beforeRemoval) {
            var self = this;
            var map = new LastStepShortestPathMap(this.startPoint, polygon, maps,
                                                    this.getSurface());
            var regions = [];
            self.steps.enqueue(this.displayRegion(map, regions, "passthrough",
                                "passthroughBrief.html", midButtonText));
            self.steps.enqueue(this.displayRegion(map, regions, "edge",
                                "edgeBrief.html", midButtonText));
            self.steps.enqueue(this.displayRegion(map, regions, "point",
                                "vertexBrief.html", endingButtonText));
            self.steps.enqueue(beforeRemoval);
            self.steps.enqueue(function (finished) {
                _.each(regions, function (region) {
                    region.removeShape();
                }, this);
                finished();
            });
            
            return map;
        },

        displayRegion: function (map, regions, regionType, explanation, buttonText) {
            var self = this;
            return function (finished) {
                var newRegions = map.displayRegions(self.getSurface(), regionType);
                Array.prototype.push.apply(regions, newRegions);
                self.newMessage(explanation);
                self.setButtonText(buttonText);
                self._nextStep = finished;
            };
        },

        filterPolygons: function (quiet) {
            var self = this;
            function add(fun) {
                if (!quiet) {
                    self.steps.enqueue(fun);
                }
            }
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
                add(function (finished) {
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
                add(function (finished) {
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
                add(function (finished) {
                    self.newMessage("filterContainsEndpoints.html");
                    if (split["unfiltered"]) {
                        self.setButtonText("Start With the First Polygon");
                    } else {
                        self.setButtonText("Construct the Path");
                    }
                    self._nextStep = finished;
                });
            }
            return split["unfiltered"] || [];
        },

        onNextStepReady: function () {
            if (!this.started) {
                this.preventInteraction();
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
