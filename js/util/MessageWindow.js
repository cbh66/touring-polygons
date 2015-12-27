define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dijit/layout/ContentPane",
        "lib/lodash"
    ], function (
        declare,
        lang,
        ContentPane,
        _
    ) {

    /**
     *  @class
     *  @name  MessageWindow
     */
    var MessageWindow = declare(ContentPane, {

        constructor: function () {
            this.cache = {};
            this.basePath = "";
        },

        displayFile: function (fileName) {  // async
            this._withContentsOf(fileName, function (contents) {
                this.set("content", contents);
            }, this);
        },

        appendFile: function (fileName) {
            this._withContentsOf(fileName, function (contents) {
                this.appendContent(contents);
            }, this);
        },

        appendContent: function (content) {
            this.set("content", this.get("content") + content);
        },

        _withContentsOf: function (fileName, callback, context) {
            context = context || this;
            var self = this;
            if (this.cache[fileName] !== undefined) {
                callback.call(context, this.cache[fileName]);
            } else {
                require(["dojo/text!" + this.basePath + fileName], function (contents) {
                    self.cache[fileName] = contents;
                    callback.call(context, contents);
                });
            }
        },

        setBasePathAttr: function (newPath) {
            if (newPath !== "") {
                if (!_.endsWith(newPath, "/")) {
                    newPath += "/";
                }
            }
            this.basePath = newPath;
        }
    });

    return MessageWindow;
});
