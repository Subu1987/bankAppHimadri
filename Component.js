sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/infocus/ZBankApp/model/models",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/ui/core/BusyIndicator",
	"sap/ui/core/Core"
], function(UIComponent, Device, models, JSONModel, MessageBox, BusyIndicator, Core) {
	"use strict";

	return UIComponent.extend("com.infocus.ZBankApp.Component", {

		metadata: {
			manifest: "json"
		},

		init: function() {
			// Call base component's init
			UIComponent.prototype.init.apply(this, arguments);

			// Set device model
			this.setModel(models.createDeviceModel(), "device");

			var oModel = this.getModel();

			/*if (oModel) {
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
			}*/

			// Initialize router
			this.getRouter().initialize();
			// If FLP user setting should control theme, skip this block.
			// Core.attachInit(function() {
			// 	setTimeout(function() {
			// 		sap.ui.getCore().applyTheme("sap_fiori_3_dark");
			// 		console.log("Applied theme: sap_fiori_3_dark");
			// 	}, 1000); // Delay ensures FLP has initialized its own theme manager
			// });
		}
	});
});