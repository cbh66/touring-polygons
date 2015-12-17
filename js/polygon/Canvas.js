define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojox/gfx",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_OnDijitClickMixin",
        "polygon/Polygon",
        "lib/lodash"
    ], function (
        declare,
        lang,
        gfx,
        _WidgetBase,
        _TemplatedMixin,
        _OnDijitClickMixin,
        Polygon,
        _
    ) {


    /**
     *  @class
     *  @name  Canvas
     */
    var Canvas = declare([_WidgetBase, _TemplatedMixin, _OnDijitClickMixin], {
        templateString: "<div></div>",

        vertexColor: "yellow",
        vertexOutline: "blue",
        vertexFlash: "red",
        edgeColor: "green",
        edgeWidth: 2,
        vertexRadius: 5,

        constructor: function () {
            this.shapes = [];
            this.tools = [];
            this.incompleteShape = false;
        },

        postCreate: function () {
            var surface = this.surface = gfx.createSurface(this.domNode);
            var ourClick = false;
            var self = this;
            this.on("mousedown", function () {
                ourClick = true;
            });
            this.on("mouseup", function (e) {
                if (ourClick) {
                    self._onClick(e);
                    ourClick = false;
                }
            });
            return this.inherited(arguments);
        },

        addTool: function (tool) {
            // Tools can have these methods:
            // onNewPolygon, onPolygonCreated, onVertexCreated, onVertexMoved
            this.tools.push(tool);
        },

        signalTools: function (event, args) {  // Args are variadic.
            event = event.charAt(0).toUpperCase() + event.slice(1);
            var methodName = "on" + event;
            args = _.toArray(arguments).slice(1);
            _.each(this.tools, function (tool) {
                if (_.isFunction(tool[methodName])) {
                    tool[methodName].apply(tool, args);
                }
            }, args);
        },

        removeTool: function (tool) {
            if (_.isFinite(tool)) {

            } else {

            }
        },

        _onClick: function (e) {
            if (!this.incompleteShape) {
                var self = this;
                var newPolygon = new Polygon(this.surface, {
                    edgeWidth: self.edgeWidth,
                    edgeColor: self.edgeColor,
                    vertexFill: self.vertexFill,
                    vertexOutline: self.vertexOutline,
                    vertexRadius: self.vertexRadius
                });
                this.signalTools("newPolygon", newPolygon);
                newPolygon.onPointCreate(lang.hitch(this, this.signalTools, "vertexCreated"));
                newPolygon.onPointMove(lang.hitch(this, this.signalTools, "vertexMoved"));
                newPolygon.onPointCreate(-1, lang.hitch(this, this.signalTools,
                                                        "polygonCreated", newPolygon));
                newPolygon.onPointCreate(-1, function () {
                    self.incompleteShape = false;
                })
                this.shapes.push(newPolygon);
                this.incompleteShape = true;
            }
            var inProgress = this.shapes[this.shapes.length - 1];
            inProgress.addPoint({x: e.layerX, y: e.layerY});
        }
    });

    return Canvas;
});
