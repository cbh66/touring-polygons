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
            this._messagePane.placeAt("messagePane");
            this._designArea.placeAt("main-area");
            this._buildIntro("main/text/intro.html", "pageOverlay");
            this._messagePane.displayFile("instructions.html");
            this._shortcutButton.set("text", "See the Path");
            this._shortcutButton.placeAt("nextButton");
            this._nextButton.set("text", "Step by Step Solution");
            this._nextButton.placeAt("nextButton");

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
            mainArea = dom.byId(mainArea);
            on.once(mainArea, "click", function (e) {
                console.log(e);
                self.fadeOutAndHide(mainArea);
            });
        },

        shortcutPressed: function () {
            function toggle(value, vals) {
                var index = _.indexOf(vals, value);
                index = (index + 1) % vals.length;
                return vals[index];
            }
            var settings = ["See the Path", "Hide the Path"];
            var newVal = toggle(this._shortcutButton.get("text"), settings);
            this._shortcutButton.set("text", newVal);
            //this._shortcutButton.destroy();
        }
    });

    return InterfaceManager;
});
