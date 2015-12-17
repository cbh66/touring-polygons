define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "lib/lodash"
    ], function (
        declare,
        lang,
        _
    ) {

    /**
     *  @class
     *  @name  PolygonCreationTool
     */
    var PolygonCreationTool = declare(null, {

        vertexColor: "yellow",
        vertexOutline: "blue",
        vertexFlash: "red",
        edgeColor: "green",
        edgeWidth: 2,
        vertexRadius: 5,

        onNewPolygon: function (polygon) {
            function showValid() {
                polygon.set("edgeColor", "green");
            }
            function showInvalid() {
                polygon.set("edgeColor", "red");
            }
            this.currentPolygon = polygon;
            polygon.onProperties(["simple", "convex"], showValid, showInvalid);
        },

        onVertexCreated: function (vertex, index) {
            var callbacks = [];
            var self = this;
            if (index === 0) {
                callbacks.push(vertex.on("mouseover", function () {
                    vertex.setFill(self.vertexFlash);
                }));
                callbacks.push(vertex.on("mouseout", function () {
                    vertex.setFill(self.vertexColor);
                }));
                callbacks.push(vertex.on("mousedown", function (e) {
                    _.each(callbacks, function (callback) {
                        callback.remove();
                    }, this);
                    e.stopPropagation();  // Don't want to make a new point
                    self.currentPolygon.close();
                    self.incompleteShape = false;
                    vertex.setFill(self.vertexColor);
                }));
            }
        }
    });

    return PolygonCreationTool;
});
