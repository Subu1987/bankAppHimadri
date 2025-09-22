sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "com/infocus/venderApp/model/models",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"
], function (UIComponent, Device, models, JSONModel, MessageBox, BusyIndicator) {
    "use strict";

    return UIComponent.extend("com.infocus.venderApp.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            // Call base component's init
            UIComponent.prototype.init.apply(this, arguments);

            // Set device model
            this.setModel(models.createDeviceModel(), "device");

            var oModel = this.getModel();

            if (oModel) {
                BusyIndicator.show(0); // Show busy while metadata loads

                oModel.attachMetadataLoaded(function () {
                    BusyIndicator.hide(); // Hide once metadata is loaded
                    console.log("OData metadata successfully loaded.");
                });

                oModel.attachMetadataFailed(function (oError) {
                    BusyIndicator.hide();
                    console.error("OData metadata load failed:", oError);
                    MessageBox.error("Failed to load service metadata. Please contact support.");
                });
            }

            // Initialize router
            this.getRouter().initialize();
        }
    });
});
