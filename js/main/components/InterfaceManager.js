define([
        "dojo/_base/declare",
        "dojo/io-query",
        "dojo/_base/fx",
        "dojo/dom-style",
        "dojo/dom",
        "dojo/dom-construct"
    ], function (
        declare,
        ioQuery,
        fx,
        domStyle,
        dom,
        domConstruct
    ) {


    /**
     *  @class
     *  @name  InterfaceManager
     *  @extends dijit._WidgetBase
     */
    var InterfaceManager = declare(null, {

        events: function () {
            return [
                {name: "startApp", source: "appStart"}
            ];
        },

        /**
         *
         *  @memberof InterfaceManager.prototype
         */
        build: function () {
            this._toolbar.placeAt("toolbar");
            this._toolbar.startup();
            this._designArea.placeAt("main-area");
            this._designArea.startup();

            this.fadeOut();
            this.startApp();
        },

        fadeOut: function () {
            setTimeout(function () {
                fx.fadeOut({
                    node: dom.byId("loadingOverlay"),
                    duration: 1000,
                    onEnd: function(node){
                        domStyle.set(node, 'display', 'none');
                    }
                }).play();
            }, 100);
        }
    });

    return InterfaceManager;
});
