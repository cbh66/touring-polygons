define([
        "dojo/_base/declare",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_OnDijitClickMixin",
        "lib/lodash"
    ], function (
        declare,
        _WidgetBase,
        _TemplatedMixin,
        _OnDijitClickMixin,
        _
    ) {

    var EventButton = declare([_WidgetBase, _TemplatedMixin,
                                _OnDijitClickMixin], {
        templateString: "<div class='eventButton' data-dojo-attach-event='ondijitclick:_fireEvent'></div>",

        event: "",
        text: "",

        constructor: function () {
            this.tooLate = false;
        },

        events: function () {
            this.tooLate = true;
            return [
                {name: "_fireEvent", source: this.event}
            ];
        },

        postCreate: function () {
            this.domNode.innerHTML = this.text;
            this.inherited(arguments);
        },

        _setEventAttr: function (event) {
            if (_.isFunction(event)) {
                this._fireEvent = event;
            } else if (this.tooLate) {
                console.error("Could not set new event '" + event + "': App already connected.");
            } else {
                this.event = event;
            }
        },

        _setTextAttr: function (text) {
            this.domNode.innerHTML = this.text = text;
        },

        _fireEvent: function () {
            console.error("No event connected to button.");
        }
    });
    
    return EventButton;
});