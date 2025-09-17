sap.ui.define([
	"com/infocus/venderApp/controller/BaseController",
	"sap/m/MessageBox",
	"sap/ui/core/BusyIndicator"
], function(BaseController, MessageBox, BusyIndicator) {
	"use strict";

	return BaseController.extend("com.infocus.venderApp.controller.App", {

		onInit: function() {
		    console.log("App Controller onInit called");

			// Load metadata for the default OData model (defined in manifest)
			this._loadAllModelMetadata();
		},

		_loadAllModelMetadata: function() {
			BusyIndicator.show(0); // Show immediately

			setTimeout(() => {
				const oModel = this.getOwnerComponent().getModel();
				if (!oModel) {
					BusyIndicator.hide();
					MessageBox.error("OData Model not found. Please check manifest.json configuration.");
					return;
				}

				oModel.metadataLoaded()
					.then(() => {
						console.log("✅ OData model metadata loaded successfully.");
						BusyIndicator.hide();
					})
					.catch((err) => {
						console.error("❌ Failed to load metadata:", err);
						BusyIndicator.hide();

						MessageBox.error("Failed to load metadata for the OData service. Please try again or contact support.");
					});
			}, 0);
		}
	});
});