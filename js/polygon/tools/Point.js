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
     *  @name  Canvas
     */
    var Point = declare(null, {

        constructor: function (properties) {
            _.defaultsDeep(properties, {
                x: 0, y: 0, r:5,
                fill: "yellow",
                outline: "blue"
            });

        }
    });

    return Point;
});
