define([
        "dojo/_base/declare",
        "dojo/io-query",
        "dojo/_base/fx",
        "dojo/dom-style",
        "dojo/dom",
        "dojo/dom-construct",
        "dojo/on",
        "util/MessageWindow"
    ], function (
        declare,
        ioQuery,
        fx,
        domStyle,
        dom,
        domConstruct,
        on,
        MessageWindow
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
            this._messagePane.placeAt("messagePane");
            this._buildIntro("main/text/intro.html", "main-area");

            this.fadeOutAndHide(dom.byId("loadingOverlay"));
            this.startApp();
        },

        fadeOutAndHide: function (node, callback) {
            callback = callback || _.noop;
            setTimeout(function () {
                fx.fadeOut({
                    node: node,
                    duration: 1000,
                    onEnd: function(node){
                        domStyle.set(node, 'display', 'none');
                        callback();
                    }
                }).play();
            }, 100);
        },

        _buildIntro: function (startingText, mainArea) {
            var self = this;
            var mainPage = new MessageWindow();
            mainPage.placeAt(mainArea);
            mainPage.displayFile(startingText);
            on.once(dom.byId(mainArea), "click", function () {
                self.fadeOutAndHide(mainPage.domNode, function () {
                    self._designArea.placeAt(mainArea);
                    self._messagePane.displayFile("instructions.html");
                });
            });
        }
    });

    return InterfaceManager;
});
