sap.ui.define([
	"com/infocus/venderApp/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/viz/ui5/api/env/Format",
	"com/infocus/venderApp/libs/html2pdf.bundle",
	"jquery.sap.global"
], function(BaseController, Fragment, Filter, FilterOperator, JSONModel, MessageBox, Format, html2pdf_bundle, jQuery) {
	"use strict";

	return BaseController.extend("com.infocus.venderApp.controller.Home", {

		/*************** on Load Functions *****************/
		onInit: function() {

			this._initializeApp();

		},
		_initializeApp: function() {
			try {
				this._initializeAppData();
				this._updateGlobalDataModel();
			} catch (err) {
				console.error("Error initializing the app:", err);
				sap.m.MessageBox.error("An error occurred during app initialization. Please contact support.");
			}
		},
		_initializeAppData: function() {
			/*this.getSupplierMasterParametersData();*/
			this.getVendorHistoryBackendData();
		},
		_updateGlobalDataModel: function() {
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			if (!oGlobalDataModel) {
				console.error("Global data model is not available.");
				sap.m.MessageToast.show("Unable to access global data model.");
				return;
			}

			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/selectedTabText", "All Supplier Turnover");
				oGlobalDataModel.setProperty("/selectedTabTextSupplierDue", "All Supplier Outstanding");
				oGlobalDataModel.setProperty("/selectedTabTextSupplierDueQtrFY", "Single Supplier Outstanding");
				oGlobalDataModel.setProperty("/isChartFragment1Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment2Visible", false);
				oGlobalDataModel.setProperty("/isChartFragment3Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment4Visible", false);
				oGlobalDataModel.setProperty("/isChartFragment5Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment6Visible", false);
				oGlobalDataModel.setProperty("/isChartFragment7Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment8Visible", false);

			} else {
				console.error("Global data model is not available.");
			}
		},
		validateInputs: function() {
			var oComponent = this.getOwnerComponent();
			var oGlobalData = oComponent.getModel("globalData").getData();
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();
			var oView = this.getView();

			// Friendly field names
			var mFieldNames = {
				"_supplierInputId": "Supplier",
				"_financialYearInputId": "Fiscal Year",
				"_quarterInputId": "Quarter",
				"_quarterInputYearId": "Quarter Year",
				"_supplierDueDatePickerId": "Supplier Due Date"
			};

			// --- Determine input IDs to validate using switch ---
			var aInputIds = [];
			switch (oSelectedIndex) {
				case 0: // Radio: index 0
					switch (oGlobalData.selectedTabText) {
						case "Single Supplier Turnover":
							aInputIds = ["_supplierInputId", "_financialYearInputId"];
							break;
						default:
							aInputIds = ["_financialYearInputId"];
							break;
					}
					break;

				case 1: // Radio: index 1
					switch (oGlobalData.selectedTabText) {
						case "Single Supplier Turnover":
							aInputIds = ["_supplierInputId", "_quarterInputId", "_quarterInputYearId"];
							break;
						default:
							aInputIds = ["_quarterInputId", "_quarterInputYearId"];
							break;
					}
					break;

				case 2: // Radio: index 2
					switch (oGlobalData.selectedTabTextSupplierDue) {
						case "Single Supplier Outstanding":
							aInputIds = ["_supplierInputId", "_supplierDueDatePickerId"];
							break;
						default:
							aInputIds = ["_supplierDueDatePickerId"];
							break;
					}
					break;

				default: // Radio: index 3+
					switch (oGlobalData.selectedTabTextSupplierDueQtrFY) {
						case "Single Supplier Outstanding":
							aInputIds = ["_supplierInputId", "_quarterInputYearId"];
							break;
						default:
							aInputIds = ["_quarterInputYearId"];
							break;
					}
					break;
			}

			// --- Validate selected inputs ---
			var bAllValid = true;
			var aEmptyFields = [];

			aInputIds.forEach(function(sId) {
				var oControl = oView.byId(sId);
				if (oControl && oControl.getVisible()) {
					var sFieldName = mFieldNames[sId] || sId;

					// DatePicker validation
					if (oControl.isA("sap.m.DatePicker")) {
						if (!oControl.getDateValue()) {
							oControl.setValueState("Error");
							oControl.setValueStateText("Please select a valid date.");
							bAllValid = false;
							aEmptyFields.push(sFieldName);
						} else {
							oControl.setValueState("None");
						}
					}
					// Input/ComboBox/Select validation
					else if (oControl.isA("sap.m.Input") || oControl.isA("sap.m.ComboBox") || oControl.isA("sap.m.Select")) {
						var sValue = oControl.getValue ? oControl.getValue().trim() : "";
						if (!sValue) {
							oControl.setValueState("Error");
							oControl.setValueStateText("This field cannot be empty.");
							bAllValid = false;
							aEmptyFields.push(sFieldName);
						} else {
							oControl.setValueState("None");
						}
					}
				}
			});

			// --- Show error if any fields are invalid ---
			if (aEmptyFields.length > 0) {
				sap.m.MessageBox.error("Please fill the following fields:\n\n" + aEmptyFields.join("\n"));
			}

			return bAllValid;
		},

		/*************** get parameters data *****************/

		getSupplierMasterParametersData: function() {
			var that = this;
			var oModel = this.getOwnerComponent().getModel();
			var oSupplierMasterModel = this.getOwnerComponent().getModel("supplierMasterData");
			var sUrl = "/SUPP_MasterSet";

			if (!oModel || !oSupplierMasterModel) {
				console.error("Required models are not available.");
				sap.m.MessageBox.error("Could not access required models for fetching supplier data.");
				return;
			}

			sap.ui.core.BusyIndicator.show();

			oModel.read(sUrl, {
				success: function(oResponse) {
					sap.ui.core.BusyIndicator.hide();

					var aResults = oResponse && oResponse.results ? oResponse.results : [];

					// Sort suppliers numerically by lifnr (supplier number)
					aResults.sort(function(a, b) {
						var iA = parseInt(a.lifnr, 10);
						var iB = parseInt(b.lifnr, 10);
						return iA - iB;
					});

					oSupplierMasterModel.setData(aResults || []);
					console.log("Supplier master data loaded:", aResults);
				},
				error: function(oError) {
					sap.ui.core.BusyIndicator.hide();
					console.error("Error fetching supplier master data:", oError);

					var sErrorMessage = "Failed to fetch supplier master data.";
					try {
						var oErrorObj = JSON.parse(oError.responseText);
						if (oErrorObj && oErrorObj.error && oErrorObj.error.message && oErrorObj.error.message.value) {
							sErrorMessage = oErrorObj.error.message.value;
						}
					} catch (e) {
						console.warn("Error parsing error response JSON:", e);
					}

					sap.m.MessageBox.error(sErrorMessage);
				}
			});
		},
		getVendorHistoryBackendData: function() {
			var oModel = this.getOwnerComponent().getModel();
			var oVendorHistoryModel = this.getOwnerComponent().getModel("venderHistoryData");

			if (!oModel || !oVendorHistoryModel) {
				console.error("Required models are not available.");
				sap.m.MessageBox.error("Could not access required models for fetching vendor history data.");
				return;
			}

			// Example values (replace with dynamic values from inputs/models)
			var sBukrs = "1100";
			var sLifnr = "0001000760";
			var sBudat = "20260331";

			// Build filters
			var aFilters = this._buildVendorHistoryFilters(sBukrs, sLifnr, sBudat);

			sap.ui.core.BusyIndicator.show();

			oModel.read("/es_vend_hstset", {
				filters: aFilters,
				success: function(oResponse) {
					sap.ui.core.BusyIndicator.hide();

					var aResults = (oResponse && oResponse.results) ? oResponse.results : [];

					// Optional sorting by lifnr
					if (aResults.length > 0 && aResults[0].lifnr) {
						aResults.sort(function(a, b) {
							return parseInt(a.lifnr, 10) - parseInt(b.lifnr, 10);
						});
					}

					oVendorHistoryModel.setData(aResults || []);
					console.log("Vendor history data loaded:", aResults);
				},
				error: function(oError) {
					sap.ui.core.BusyIndicator.hide();
					console.error("Error fetching vendor history data:", oError);

					var sErrorMessage = "Failed to fetch vendor history data.";
					try {
						var oErrorObj = JSON.parse(oError.responseText);
						if (oErrorObj && oErrorObj.error && oErrorObj.error.message && oErrorObj.error.message.value) {
							sErrorMessage = oErrorObj.error.message.value;
						}
					} catch (e) {
						console.warn("Error parsing error response JSON:", e);
					}

					sap.m.MessageBox.error(sErrorMessage);
				}
			});
		},

		_buildVendorHistoryFilters: function(sBukrs, sLifnr, sBudat) {
			return [
				new sap.ui.model.Filter("bukrs", sap.ui.model.FilterOperator.EQ, sBukrs),
				new sap.ui.model.Filter("lifnr", sap.ui.model.FilterOperator.EQ, sLifnr),
				new sap.ui.model.Filter("budat", sap.ui.model.FilterOperator.LE, sBudat)
			];
		},

		/*************** set the inputId & create the fragment *****************/

		handleValueSupplierMaster: function(oEvent) {
			this._supplierInputId = oEvent.getSource().getId();
			var that = this;

			if (!this._oSupplierMasterDialog) {
				Fragment.load({
					id: that.getView().getId(),
					name: "com.infocus.venderApp.view.dialogComponent.DialogSupplierMaster",
					controller: that
				}).then(function(oDialog) {
					that._oSupplierMasterDialog = oDialog;
					that.getView().addDependent(oDialog);
					oDialog.open();
				}).catch(function(oError) {
					console.error("Error loading Supplier Master Dialog:", oError);
					sap.m.MessageBox.error("Failed to open Supplier Master dialog.");
				});
			} else {
				this._oSupplierMasterDialog.open();
			}
		},
		/*handleValueFiscalYear: function(oEvent) {
			this._financialYearInputId = oEvent.getSource().getId();
			var that = this;

			if (!this.oOpenDialogFiscalYear) {
				try {
					this.oOpenDialogFiscalYear = sap.ui.xmlfragment("com.infocus.purchaseApplication.view.dialogComponent.DialogFiscalYear", this);
					this.getView().addDependent(this.oOpenDialogFiscalYear);
				} catch (err) {
					console.error("Failed to load Fiscal Year dialog:", err);
					sap.m.MessageBox.error("Failed to open Fiscal Year dialog.");
					return;
				}
			}
			this.oOpenDialogFiscalYear.open();
		},
		handleValueQuarter: function(oEvent) {
			this._quarterInputId = oEvent.getSource().getId();
			var that = this;

			if (!this.oOpenDialogQuarter) {
				try {
					this.oOpenDialogQuarter = sap.ui.xmlfragment("com.infocus.purchaseApplication.view.dialogComponent.DialogQuarter", this);
					this.getView().addDependent(this.oOpenDialogQuarter);
				} catch (err) {
					console.error("Failed to load Quarter dialog:", err);
					sap.m.MessageBox.error("Failed to open Quarter dialog.");
					return;
				}
			}
			this.oOpenDialogQuarter.open();
		},
		handleValueQuarterYear: function(oEvent) {
			this._quarterInputYearId = oEvent.getSource().getId();
			var that = this;

			if (!this.oOpenDialogQuarterYear) {
				try {
					this.oOpenDialogQuarterYear = sap.ui.xmlfragment("com.infocus.purchaseApplication.view.dialogComponent.DialogQuarterYear", this);
					this.getView().addDependent(this.oOpenDialogQuarterYear);
				} catch (err) {
					console.error("Failed to load Quarter Year dialog:", err);
					sap.m.MessageBox.error("Failed to open Quarter Year dialog.");
					return;
				}
			}
			this.oOpenDialogQuarterYear.open();
		},*/

		/*************** search value within fragment *****************/

		onSearchSupplierMaster: function(oEvent) {
			var sQuery = oEvent.getParameter("newValue");
			var oList = Fragment.byId(this.getView().getId(), "idSupplierMasterList");
			if (!oList) return;

			var oBinding = oList.getBinding("items");
			if (!oBinding) return;

			var aFilters = [];
			if (sQuery) {
				var oFilter1 = new sap.ui.model.Filter("lifnr", sap.ui.model.FilterOperator.Contains, sQuery);
				var oFilter2 = new sap.ui.model.Filter("name1", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(new sap.ui.model.Filter({
					filters: [oFilter1, oFilter2],
					and: false
				}));
			}

			oBinding.filter(aFilters);
		},
		/*_handleFiscalYearSearch: function(oEvent) {
			var sQuery = oEvent.getParameter("value");
			var oDialog = oEvent.getSource();

			var aItems = oDialog.getItems();
			aItems.forEach(function(oItem) {
				var sTitle = oItem.getTitle();
				if (sTitle && sTitle.toLowerCase().includes(sQuery.toLowerCase())) {
					oItem.setVisible(true);
				} else {
					oItem.setVisible(false);
				}
			});
		},
		_handleQuarterYearSearch: function(oEvent) {
			var sQuery = oEvent.getParameter("value");
			var oDialog = oEvent.getSource();

			var aItems = oDialog.getItems();
			aItems.forEach(function(oItem) {
				var sTitle = oItem.getTitle();
				if (sTitle && sTitle.toLowerCase().includes(sQuery.toLowerCase())) {
					oItem.setVisible(true);
				} else {
					oItem.setVisible(false);
				}
			});
		},*/

		/*************** set the each property to globalData & reflect data in input field & Date Picker *****************/

		onSelectionChangeSupplierMaster: function(oEvent) {
			var oList = oEvent.getSource();
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var aSelectedSupplierIDs = oGlobalModel.getProperty("/selectedSupplierIDs") || [];
			var aSelectedSupplierNames = oGlobalModel.getProperty("/selectedSupplierNames") || [];

			var aAllItems = oList.getItems();
			aAllItems.forEach(function(oItem) {
				var sID = oItem.getTitle();
				var sName = oItem.getDescription();

				// If item is selected
				if (oItem.getSelected()) {
					if (!aSelectedSupplierIDs.includes(sID)) {
						aSelectedSupplierIDs.push(sID);
						aSelectedSupplierNames.push(sName);
					}
				} else {
					// If item is unselected
					var index = aSelectedSupplierIDs.indexOf(sID);
					if (index !== -1) {
						aSelectedSupplierIDs.splice(index, 1);
						aSelectedSupplierNames.splice(index, 1);
					}
				}
			});

			oGlobalModel.setProperty("/selectedSupplierNames", aSelectedSupplierNames);
			oGlobalModel.setProperty("/selectedSupplierIDs", aSelectedSupplierIDs);
			oGlobalModel.setProperty("/selectedSupplierNamesDisplay", aSelectedSupplierNames.join(", "));
		},
		onConfirmSupplierMaster: function() {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");

			// Values are already being maintained correctly in the model
			var aSelectedNamesDisplay = oGlobalModel.getProperty("/selectedSupplierNamesDisplay") || "";
			var aSelectedNames = oGlobalModel.getProperty("/selectedSupplierNames") || [];
			var aSelectedIDs = oGlobalModel.getProperty("/selectedSupplierIDs") || [];

			// You can now directly use these for any processing or display
			console.log("Confirmed selected IDs:", aSelectedIDs);
			console.log("Confirmed selected Names:", aSelectedNames);
			console.log("Confirmed selected Display Names:", aSelectedNamesDisplay);

			oGlobalModel.refresh(true);

			this._resetSupplierMasterDialog();
			this._oSupplierMasterDialog.close();
		},
		onCloseSupplierMaster: function() {
			// Clear global model selections
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			oGlobalModel.setProperty("/selectedSupplierIDs", []);
			oGlobalModel.setProperty("/selectedSupplierNames", []);
			oGlobalModel.setProperty("/selectedSupplierNamesDisplay", "");

			this._resetSupplierMasterDialog();
			this._oSupplierMasterDialog.close();
		},
		_resetSupplierMasterDialog: function() {
			var oList = Fragment.byId(this.getView().getId(), "idSupplierMasterList");
			var oSearchField = Fragment.byId(this.getView().getId(), "idSupplierSearchField");

			// Clear Search
			if (oSearchField) {
				oSearchField.setValue("");

				// Manually trigger the liveChange event handler with empty value
				this.onSearchSupplierMaster({
					getParameter: function() {
						return "";
					}
				});
			}

			// Clear selections
			if (oList) {
				oList.getItems().forEach(function(oItem) {
					oItem.setSelected(false);
				});
			}
		},
		
		/*_handleFiscalYearClose: function(oEvent) {
			var aSelectedItems = oEvent.getParameter("selectedItems"); // Get selected items (multiSelect enabled)
			var aSelectedYears = [];

			if (aSelectedItems && aSelectedItems.length > 0) {
				aSelectedItems.forEach(function(oItem) {
					aSelectedYears.push(oItem.getTitle()); // Collect selected years
				});

				var oFiscalYearInput = this.byId(this._fiscalYearInputId); // Ensure input ID is correct
				if (oFiscalYearInput) {
					oFiscalYearInput.setValue(aSelectedYears.join(", ")); // Display selected values in input
				}

				// Store selected fiscal years in the global model
				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/fiscalYears", aSelectedYears);
				}
			}

			// Reset visibility
			oEvent.getSource().getItems().forEach(function(oItem) {
				oItem.setVisible(true);
			});
		},
		_handleValueQuarterClose: function(oEvent) {
			var aSelectedItems = oEvent.getParameter("selectedItems"); // Get selected items for multiSelect
			var aSelectedQuarters = [];

			if (aSelectedItems && aSelectedItems.length > 0) {
				aSelectedItems.forEach(function(oItem) {
					aSelectedQuarters.push(oItem.getTitle()); // Collect selected quarters
				});

				var oQuarterInput = this.byId(this._quarterInputId); // Ensure input ID is correct
				if (oQuarterInput) {
					oQuarterInput.setValue(aSelectedQuarters.join(", ")); // Display selected values
				}

				// Store selected quarters in the global model
				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/selectedQuarters", aSelectedQuarters);
				}
			}

			// Reset visibility
			oEvent.getSource().getItems().forEach(function(oItem) {
				oItem.setVisible(true);
			});
		},
		_handleQuarterYearClose: function(oEvent) {
			var aSelectedItems = oEvent.getParameter("selectedItems"); // Get selected items for multiSelect
			var aSelectedYears = [];

			if (aSelectedItems && aSelectedItems.length > 0) {
				aSelectedItems.forEach(function(oItem) {
					aSelectedYears.push(oItem.getTitle()); // Collect selected years
				});

				var oQuarterYearInput = this.byId(this._quarterInputYearId); // Ensure input ID is correct
				if (oQuarterYearInput) {
					oQuarterYearInput.setValue(aSelectedYears.join(", ")); // Display selected values
				}

				// Store selected quarter years in the global model
				var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
				if (oGlobalDataModel) {
					oGlobalDataModel.setProperty("/selectedQuarterYears", aSelectedYears);
				}
			}

			// Reset visibility
			oEvent.getSource().getItems().forEach(function(oItem) {
				oItem.setVisible(true);
			});
		},
		onSupplierDueDateChange: function(oEvent) {
			var oDatePicker = oEvent.getSource();
			var sValue = oEvent.getParameter("value"); // formatted as yyyyMMdd (because of valueFormat)
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");

			if (!sValue) {
				// If cleared, reset the model value
				oGlobalModel.setProperty("/selectedSupplierDueDate", null);
				return;
			}

			// Optional: validate date
			var oDate = oDatePicker.getDateValue();
			if (!oDate) {
				sap.m.MessageToast.show("Invalid date selected. Please try again.");
				oGlobalModel.setProperty("/selectedSupplierDueDate", null);
				return;
			}

			// Store in model (already yyyyMMdd due to valueFormat)
			oGlobalModel.setProperty("/selectedSupplierDueDate", sValue);
		},*/

		/*************** Clear the input value in livechange event  *****************/

		onSupplierInputLiveChange: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sValue = oEvent.getParameter("value");
			if (!sValue) {
				oGlobalModel.setProperty("/selectedSupplierNames", []);
				oGlobalModel.setProperty("/selectedSupplierIDs", []);
				oGlobalModel.setProperty("/selectedSupplierNamesDisplay", "");
			}
		},
		
		/*onFiscalYearInputLiveChange: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sValue = oEvent.getParameter("value");
			if (!sValue) {
				oGlobalModel.setProperty("/fiscalYears", "");
			}
		},
		onQuarterInputLiveChange: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sValue = oEvent.getParameter("value");
			if (!sValue) {
				oGlobalModel.setProperty("/selectedQuarters", "");
			}
		},
		onQuarterYearInputLiveChange: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sValue = oEvent.getParameter("value");
			if (!sValue) {
				oGlobalModel.setProperty("/selectedQuarterYears", "");
			}
		},*/

		/*************** radio Button & drop down selection  *****************/

		/*onRadioButtonSelectList: function(oEvent) {
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var {
				selectedTabText,
				selectedTabTextSupplierDue,
				selectedTabTextSupplierDueQtrFY
			} = oGlobalData;
			var sSelectedKey = oEvent.getSource().getSelectedIndex();

			// Cache all controls in one go
			var oView = this.getView();
			var controls = {
				fiscalYear: oView.byId("fiscalYearBox"),
				quarter: oView.byId("quarterBox"),
				quarterYear: oView.byId("quarterYearBox"),
				customerMaster: oView.byId("customerMasterBox"),
				supplierDueDate: oView.byId("supplierDueDatePickerBox"),
				panelNormal: oView.byId("panelNormalViewBox"),
				panelSupplierDue: oView.byId("panelSupplierDueViewBox"),
				panelSupplierDueQtrFy: oView.byId("panelSupplierDueQtrFyViewBox")
			};

			// Helper: hide all first
			const hideAll = () => {
				Object.values(controls).forEach(ctrl => ctrl.setVisible(false));
			};

			hideAll();

			switch (sSelectedKey) {
				case 0: // Fiscal Year Wise
					controls.fiscalYear.setVisible(true);
					controls.panelNormal.setVisible(true);

					controls.customerMaster.setVisible(selectedTabText === "Single Supplier Turnover");
					break;

				case 1: // Quarterly Wise
					controls.quarter.setVisible(true);
					controls.quarterYear.setVisible(true);
					controls.panelNormal.setVisible(true);

					controls.customerMaster.setVisible(selectedTabText === "Single Supplier Turnover");
					break;

				case 2: // Single Supplier Outstanding for Supplier Due
					controls.supplierDueDate.setVisible(true);
					controls.panelSupplierDue.setVisible(true);

					controls.customerMaster.setVisible(selectedTabTextSupplierDue === "Single Supplier Outstanding");
					break;

				case 3: // Single Supplier Outstanding for Supplier Qtr FY
					controls.quarter.setVisible(true);
					controls.quarterYear.setVisible(true);
					controls.panelSupplierDueQtrFy.setVisible(true);

					controls.customerMaster.setVisible(selectedTabTextSupplierDueQtrFY === "Single Supplier Outstanding");
					break;
			}
		},*/

		/*************** get the Icontabfilter select updated in global model  *****************/

		/*onTabSelect: function(oEvent) {
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			var oCustomerMasterBox = this.getView().byId("customerMasterBox");

			// Get the selected tab key
			var sSelectedKey = oEvent.getParameter("selectedKey");

			// Define the mapping of keys to text values
			var oTextMapping = {
				"scenario1": "All Supplier Turnover",
				"scenario2": "Top 5 Supplier Turnover",
				"scenario3": "Single Supplier Turnover",
				"scenario4": "Purchase Turnover"
			};

			// visible non-visible on customer box
			if (oTextMapping[sSelectedKey] === "Single Supplier Turnover") {
				oCustomerMasterBox.setVisible(true);
			} else {
				oCustomerMasterBox.setVisible(false);
			}

			// Update the global model with the corresponding text
			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/selectedTabText", oTextMapping[sSelectedKey] || "");
			}
		},
		onTabSelectSupplierDue: function(oEvent) {
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			var oCustomerMasterBox = this.getView().byId("customerMasterBox");

			// Get the selected tab key
			var sSelectedKey = oEvent.getParameter("selectedKey");

			// Define the mapping of keys to text values
			var oTextMapping = {
				"scenario1": "All Supplier Outstanding",
				"scenario2": "Top 5 Supplier Outstanding",
				"scenario3": "Single Supplier Outstanding",
				"scenario4": "Total Outstanding"
			};

			// visible non-visible on customer box
			if (oTextMapping[sSelectedKey] === "Single Supplier Outstanding") {
				oCustomerMasterBox.setVisible(true);
			} else {
				oCustomerMasterBox.setVisible(false);
			}

			// Update the global model with the corresponding text
			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/selectedTabTextSupplierDue", oTextMapping[sSelectedKey] || "");
			}
		},
		onTabSelectSupplierDueQtrFY: function(oEvent) {
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			var oCustomerMasterBox = this.getView().byId("customerMasterBox");

			// Get the selected tab key
			var sSelectedKey = oEvent.getParameter("selectedKey");

			// Define the mapping of keys to text values
			var oTextMapping = {
				"scenario1": "Single Supplier Outstanding",
				"scenario2": "Total Outstanding"
			};

			// visible non-visible on customer box
			if (oTextMapping[sSelectedKey] === "Single Supplier Outstanding") {
				oCustomerMasterBox.setVisible(true);
			} else {
				oCustomerMasterBox.setVisible(false);
			}

			// Update the global model with the corresponding text
			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/selectedTabTextSupplierDueQtrFY", oTextMapping[sSelectedKey] || "");
			}
		},*/

		/*************** get the Backend data for Supplier  *****************/

		/*hasData: function(value) {
			if (Array.isArray(value)) {
				return value.length > 0; // Check if array is not empty
			} else if (typeof value === "string") {
				return value.trim() !== ""; // Check if string is not empty
			} else if (typeof value === "number") {
				return true; // Numbers are always valid
			}
			return false; // Return false for null, undefined, or empty values
		},
		getBackendData: function() {

			// Check Input Validation
			if (!this.validateInputs()) {
				return;
			}

			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var sSelectedTabText = oGlobalData.selectedTabText;
			var sSelectedTabTextSupplierDue = oGlobalData.selectedTabTextSupplierDue;
			var sSelectedTabTextSupplierDueQtrFY = oGlobalData.selectedTabTextSupplierDueQtrFY;
			var iSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			if (iSelectedIndex === 0 || iSelectedIndex === 1) {
				switch (sSelectedTabText) {
					case "All Supplier Turnover":
						this.getAllSupplierData();
						break;
					case "Top 5 Supplier Turnover":
						this.getTop5SupplierData();
						break;
					case "Single Supplier Turnover":
						this.getSingleSupplierData();
						break;
					default:
						this.getQuarterlyData();
				}
			} else if (iSelectedIndex === 2) {
				switch (sSelectedTabTextSupplierDue) {
					case "All Supplier Outstanding":
						this.getAllSupplierDueData();
						break;
					case "Top 5 Supplier Outstanding":
						this.getTop5SupplierDueData();
						break;
					case "Single Supplier Outstanding":
						this.getSingleSupplierDueData();
						break;
					default:
						this.getTotalSupplerDueData();
				}
			} else {
				switch (sSelectedTabTextSupplierDueQtrFY) {
					case "Single Supplier Outstanding":
						this.getSingleSupplierDueQtrFYData();
						break;
					case "Total Outstanding":
						this.getTotalSupplierDueQtrFYData();
						break;
					default:
						this.getSingleSupplierDueQtrFYData();
				}
			}
		},
		_buildFilters: function(oGlobalData, oSelectedIndex) {
			var filters = [];

			var oSelectedTabText = oGlobalData.selectedTabText;
			var aFiscalYears = oGlobalData.fiscalYears || [];
			var aSelectedSupplierMasterData = oGlobalData.selectedSupplierIDs || [];
			var aQuarters = oGlobalData.selectedQuarters || [];
			var aQuarterYears = oGlobalData.selectedQuarterYears || [];

			if (oSelectedIndex === 0) {
				if (aFiscalYears.length > 0) {
					filters.push(new Filter({
						filters: aFiscalYears.map(function(year) {
							return new Filter("fiscalYear", FilterOperator.EQ, year);
						}),
						and: false
					}));
				}
			} else {
				var quarterFilters = aQuarters.map(function(quarter) {
					return new Filter("fiscalQuater", FilterOperator.EQ, quarter); // double-check spelling
				});
				var quarterYearFilters = aQuarterYears.map(function(year) {
					return new Filter("quater_Year", FilterOperator.EQ, year); // double-check spelling
				});
				if (quarterFilters.length && quarterYearFilters.length) {
					filters.push(new Filter({
						filters: [
							new Filter({
								filters: quarterFilters,
								and: false
							}),
							new Filter({
								filters: quarterYearFilters,
								and: false
							})
						],
						and: true
					}));
				}
			}

			// Add supplier filter (for both tabs)
			if (oSelectedTabText === "Single Supplier Turnover" && aSelectedSupplierMasterData.length > 0) {
				filters.push(new Filter({
					filters: aSelectedSupplierMasterData.map(function(cust) {
						return new Filter("supplier", FilterOperator.EQ, cust);
					}),
					and: false
				}));
			}

			return filters;
		},
		getAllSupplierData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oAllCustListDataModel = oComponent.getModel("allCustlistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/SUPPSet", {
				filters: filters,
				success: function(response) {
					// sorting the oData
					var oData = that.sortByTurnOverDesc(response.results || []);
					console.log("Sorted Data:", oData);

					// format customer data function
					that.formatSupplierData(oData);

					// Update models based on selection
					var isSelectedIndex = oSelectedIndex === 0;
					var sPropertyPath = isSelectedIndex ? "/allCustlistDataFiscalYearWise" : "/allCustlistDataQuaterlyWise";
					var sFragmentId = isSelectedIndex ? "chartFragment1" : "chartFragment2";

					oAllCustListDataModel.setProperty(sPropertyPath, oData);

					// Toggle visibility of chart fragments
					oGlobalDataModel.setProperty("/isChartFragment1Visible", isSelectedIndex);
					oGlobalDataModel.setProperty("/isChartFragment2Visible", !isSelectedIndex);

					// Bind chart
					isSelectedIndex ? that.bindChartColorRulesByFiscalYearWise(sFragmentId, oData) : that.bindChartColorRulesByQuarterlyWise(
						sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getTop5SupplierData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oTop5CustListDataModel = oComponent.getModel("top5listData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/Supp_Top5Set", {
				filters: filters,
				success: function(response) {
					// sorting the oData
					var oData = that.sortByTurnOverDesc(response.results || []);
					console.log("Sorted Data:", oData);

					// format customer data function
					that.formatSupplierData(oData);

					// Update models based on selection
					var isSelectedIndex = oSelectedIndex === 0;
					var sPropertyPath = isSelectedIndex ? "/top5CustlistDataFiscalYearWise" : "/top5CustlistDataQuaterlyWise";
					var sFragmentId = isSelectedIndex ? "chartFragment3" : "chartFragment4";

					oTop5CustListDataModel.setProperty(sPropertyPath, oData);

					// Toggle visibility of chart fragments
					oGlobalDataModel.setProperty("/isChartFragment3Visible", isSelectedIndex);
					oGlobalDataModel.setProperty("/isChartFragment4Visible", !isSelectedIndex);

					// Bind chart
					isSelectedIndex ? that.bindChartColorRulesByFiscalYearWise(sFragmentId, oData) : that.bindChartColorRulesByQuarterlyWise(
						sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getSingleSupplierData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oSingleCustListDataModel = oComponent.getModel("singleCustlistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/SINGLE_SUPPSet", {
				filters: filters,
				success: function(response) {
					// sorting the oData
					var oData = that.sortByTurnOverDesc(response.results || []);
					console.log("Sorted Data:", oData);

					// format customer data function
					that.formatSupplierData(oData);

					// Update models based on selection
					var isSelectedIndex = oSelectedIndex === 0;
					var sPropertyPath = isSelectedIndex ? "/singleCustlistDataFiscalYearWise" : "/singleCustlistDataQuaterlyWise";
					var sFragmentId = isSelectedIndex ? "chartFragment5" : "chartFragment6";

					oSingleCustListDataModel.setProperty(sPropertyPath, oData);

					// Toggle visibility of chart fragments
					oGlobalDataModel.setProperty("/isChartFragment5Visible", isSelectedIndex);
					oGlobalDataModel.setProperty("/isChartFragment6Visible", !isSelectedIndex);

					// Bind chart
					isSelectedIndex ? that.bindChartColorRulesByFiscalYearWise(sFragmentId, oData) : that.bindChartColorRulesByQuarterlyWise(
						sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getQuarterlyData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oQuarterlyTurnoverlistDataModel = oComponent.getModel("quarterlyTurnoverlistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/POSet", {
				filters: filters,
				success: function(response) {
					// sorting the oData
					var oData = that.sortByTurnOverDesc(response.results || []);
					console.log("Sorted Data:", oData);

					// format customer data function
					that.formatSupplierData(oData);

					// Update models based on selection
					var isSelectedIndex = oSelectedIndex === 0;
					var sPropertyPath = isSelectedIndex ? "/quarterlyTurnoverlistDataFiscalYearWise" :
						"/quarterlyTurnoverlistDataQuaterlyWise";
					var sFragmentId = isSelectedIndex ? "chartFragment7" : "chartFragment8";

					oQuarterlyTurnoverlistDataModel.setProperty(sPropertyPath, oData);

					// Toggle visibility of chart fragments
					oGlobalDataModel.setProperty("/isChartFragment7Visible", isSelectedIndex);
					oGlobalDataModel.setProperty("/isChartFragment8Visible", !isSelectedIndex);

					// Bind chart
					isSelectedIndex ? that.bindChartColorRulesByFiscalYearWise(sFragmentId, oData) : that.bindChartColorRulesByQuarterlyWise(
						sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},*/

		/*************** get the Backend data for Supplier Due as on Date  *****************/

		/*_buildSupplierDueFilters: function(oGlobalData, oSelectedIndex) {
			var filters = [];

			var aSelectedSupplierMasterData = oGlobalData.selectedSupplierIDs || [];
			var sSelectedSupplierDueDate = oGlobalData.selectedSupplierDueDate; // single value from DatePicker
			var sSelectedTabTextSupplierDue = oGlobalData.selectedTabTextSupplierDue;

			// Supplier filter
			if (sSelectedSupplierDueDate) {
				filters.push(new sap.ui.model.Filter("datum", sap.ui.model.FilterOperator.EQ, sSelectedSupplierDueDate));
			}

			if (sSelectedTabTextSupplierDue === "Total Outstanding") {
				filters.push(new sap.ui.model.Filter("total_outstanding", sap.ui.model.FilterOperator.EQ, "X"));
			}

			return filters;
		},
		getAllSupplierDueData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oAllSupplierDuelistModel = oComponent.getModel("allSupplierDuelistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildSupplierDueFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/es_outstandingset", {
				filters: filters,
				success: function(response) {
					// sorting the oData
					var oData = that.sortByAmountDesc(response.results || []);
					
					console.log("All Supplier Due Data:", oData);

					// format Supplier Due data function
					that.formatSupplierDueData(oData);

					oAllSupplierDuelistModel.setProperty("/", oData);

					// Bind chart
					var sFragmentId = "chartFragment1SupplierDue";
					that.bindChartColorRulesBySupplierDue(sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getTop5SupplierDueData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oTop5SupplierDuelistModel = oComponent.getModel("top5SupplierDuelistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildSupplierDueFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/es_outstandingset", {
				filters: filters,
				urlParameters: {
					"$top": 5
				},
				success: function(response) {
					// sorting the oData
					var oData = that.sortByAmountDesc(response.results || []);
					
					console.log("Top5 Supplier Due Data:", oData);

					// format Supplier Due data function
					that.formatSupplierDueData(oData);

					oTop5SupplierDuelistModel.setProperty("/", oData);

					// Bind chart
					var sFragmentId = "chartFragment2SupplierDue";
					that.bindChartColorRulesBySupplierDue(sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getSingleSupplierDueData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oSingleSupplierDuelistModel = oComponent.getModel("singleSupplierDuelistData");

			var aSelectedSupplierMasterData = oGlobalData.selectedSupplierIDs || [];
			var sSelectedSupplierDueDate = oGlobalData.selectedSupplierDueDate;

			if (!aSelectedSupplierMasterData.length || !sSelectedSupplierDueDate) {
				sap.m.MessageBox.warning("Please select both Supplier and Due Date.");
				return;
			}

			// Take first supplier for single read
			var sSupplier = aSelectedSupplierMasterData[0];
			var sDate = sSelectedSupplierDueDate;

			var sPath = "/es_outstandingset(lifnr='" + sSupplier + "',datum='" + sDate + "')";

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read(sPath, {
				success: function(response) {
					// sorting the oData
					var oData = [];

					if (response.results) {
						oData = response.results;
					} else {
						oData = [response];
					}

					
					console.log("Single Supplier Due Data:", oData);

					// format Supplier Due data function
					that.formatSupplierDueData(oData);

					oSingleSupplierDuelistModel.setProperty("/", oData);

					// Bind chart
					var sFragmentId = "chartFragment3SupplierDue";
					that.bindChartColorRulesBySupplierDue(sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getTotalSupplerDueData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oTotalSupplierDuelistData = oComponent.getModel("totalSupplierDuelistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildSupplierDueFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/es_outstandingset", {
				filters: filters,
				success: function(response) {
					// sorting the oData
					var oData = that.sortByAmountDesc(response.results || []);
					
					console.log("Total Outstanding Supplier Due Data:", oData);

					// format Supplier Due data function
					that.formatSupplierDueData(oData);

					oTotalSupplierDuelistData.setProperty("/", oData);

					// Bind chart
					var sFragmentId = "chartFragment4SupplierDue";
					that.bindChartColorRulesBySupplierDue(sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},*/

		/*************** get the Backend data for Supplier Due as on Date Quaterly Fiscal Year  *****************/

		/*_buildSupplierDueQtrFYFilters: function(oGlobalData, oSelectedIndex) {
			var filters = [];
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			var aQuarters = oGlobalData.selectedQuarters || [];
			var aQuarterYears = oGlobalData.selectedQuarterYears || [];
			var aSelectedSupplierMasterData = oGlobalData.selectedSupplierIDs || [];
			var sSelectedTabTextSupplierDueQtrFY = oGlobalData.selectedTabTextSupplierDueQtrFY;

			// Supplier Filter
			if (sSelectedTabTextSupplierDueQtrFY === "Single Supplier Outstanding" && aSelectedSupplierMasterData.length > 0) {
				filters.push(new Filter("lifnr", FilterOperator.EQ, oGlobalData.selectedSupplierIDs));
			}

			// QuarterYear Filter (Multiple OR)
			if (aQuarterYears.length > 0) {
				var yearFilters = aQuarterYears.map(function(year) {
					return new Filter("gjahr", FilterOperator.EQ, year);
				});
				filters.push(new Filter({
					filters: yearFilters,
					and: false
				})); // false = OR

			}

			// Quarter Filter (Multiple OR)
			if (aQuarters.length > 0) {
				var quarterFilters = aQuarters.map(function(qtr) {
					return new Filter("poper", FilterOperator.EQ, qtr);
				});
				filters.push(new Filter({
					filters: quarterFilters,
					and: false
				})); // false = OR
				oGlobalDataModel.setProperty("/isQuarterSelected", true);
			} else {
				oGlobalDataModel.setProperty("/isQuarterSelected", false);
			}

			return filters;
		},
		getSingleSupplierDueQtrFYData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oSingleSupplierDueQtrFYlistData = oComponent.getModel("singleSupplierDueQtrFYlistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			var aSelectedSupplierMasterData = oGlobalData.selectedSupplierIDs || [];

			if (!aSelectedSupplierMasterData.length) {
				sap.m.MessageBox.warning("Please select both Supplier.");
				return;
			}

			// reusable filter function 
			var filters = this._buildSupplierDueQtrFYFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/es_outstanding_yearset", {
				filters: filters,
				success: function(response) {
					// sorting the oData
					var oData = that.sortByQuarterAndYear(response.results || []);
					console.log("Single Supplier Due Qtr/FY Data:", oData);

					// format Supplier Due data function
					that.formatSupplierDueData(oData);

					oSingleSupplierDueQtrFYlistData.setProperty("/", oData);

					// Bind chart
					var sFragmentId = "chartFragment1SupplierDueQtrFy";
					that.bindChartColorRulesBySupplierDueQtrFY(sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},
		getTotalSupplierDueQtrFYData: function() {
			var that = this;

			// Retrieve models once to avoid redundant calls
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oGlobalDataModel = oComponent.getModel("globalData");
			var oGlobalData = oGlobalDataModel.getData();
			var oTotalSupplierDueQtrFYlistData = oComponent.getModel("totalSupplierDueQtrFYlistData");
			var oSelectedIndex = this.byId("radioBtnlist").getSelectedIndex();

			// reusable filter function 
			var filters = this._buildSupplierDueQtrFYFilters(oGlobalData, oSelectedIndex);

			// Show busy indicator
			sap.ui.core.BusyIndicator.show();

			// OData call to fetch data
			oModel.read("/es_outstanding_yearset", {
				filters: filters,
				success: function(response) {
					// sorting the oData
					var oData = that.sortByQuarterAndYear(response.results || []);
					console.log("Total Outstanding Supplier Due Qtr/FY Data:", oData);

					// format Supplier Due data function
					that.formatSupplierDueData(oData);

					oTotalSupplierDueQtrFYlistData.setProperty("/", oData);

					// Bind chart
					var sFragmentId = "chartFragment2SupplierDueQtrFy";
					that.bindChartColorRulesBySupplierDueQtrFY(sFragmentId, oData);

					// Check if data is available
					sap.ui.core.BusyIndicator.hide();
					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: function(error) {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorObject = JSON.parse(error.responseText);
						sap.m.MessageBox.error(errorObject.error.message.value);
					} catch (e) {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
		},*/

		/*************** helper function  *****************/

		sortByTurnOverDesc: function(aData) {
			return aData.sort(function(a, b) {
				return parseFloat(b.turnOver) - parseFloat(a.turnOver);
			});
		},
		sortByAmountDesc: function(aData) {
			return aData.sort(function(a, b) {
				return parseFloat(b.amount) - parseFloat(a.amount);
			});
		},
		sortByQuarterAndYear: function(aData) {
			// Quarter order mapping
			var quarterOrder = {
				"Q1": 1,
				"Q2": 2,
				"Q3": 3,
				"Q4": 4
			};
			return aData.sort(function(a, b) {
				// Convert gjahr to number (safety)
				var yearA = parseInt(a.gjahr, 10);
				var yearB = parseInt(b.gjahr, 10);
				if (yearA !== yearB) {
					return yearA - yearB; // ascending year
				}
				// Handle quarter values like "Q1"/"1"
				var qA = a.poper.startsWith("Q") ? quarterOrder[a.poper] : parseInt(a.poper, 10);
				var qB = b.poper.startsWith("Q") ? quarterOrder[b.poper] : parseInt(b.poper, 10);
				return qA - qB; // ascending quarter
			});
		},
		formatSupplierData: function(oData) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var oSelectedTabText = oGlobalModel.getProperty("/selectedTabText");
			oData.forEach(item => {
				this.convertTurnoverToCrore(item);
				if (oSelectedTabText !== "Purchase Turnover") {
					this.generateSupplierShort(item, oSelectedTabText);
				}

			});
			return oData;
		},
		formatSupplierDueData: function(oData) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sSelectedTabTextSupplierDue = oGlobalModel.getProperty("/selectedTabTextSupplierDue");
			oData.forEach(item => {
				this.convertTurnoverToCrore(item);
				/*if (sSelectedTabTextSupplierDue !== "Purchase Turnover") {
					this.generateSupplierShort(item, sSelectedTabTextSupplierDue);
				}*/

			});
			return oData;
		},
		convertTurnoverToCrore: function(item) {
			if (item.turnOver) {
				// Convert rupees to crores (1 crore = 10,000,000)
				var croreValueTurnOver = item.turnOver / 10000000;

				// Round to 2 decimal places
				item.turnOver = parseFloat(croreValueTurnOver).toFixed(2);
			}

			if (item.amount) {
				// Convert rupees to crores (1 crore = 10,000,000)
				var croreValue = item.amount / 10000000;

				// Round to 2 decimal places
				item.amount = parseFloat(croreValue).toFixed(2);

			}

		},
		generateSupplierShort: function(item) {
			const words = item.supplier.split(" ");
			const abbreviation = words
				.filter(w => w.length > 2 && w[0] === w[0].toUpperCase())
				.map(w => w[0])
				.join("")
				.toUpperCase();

			/*item.supplierShort = abbreviation || item.supplier;*/
			item.supplierShort = item.supplier;
		},

		/*************** Clear data from all input fields,radio button & model make it default  *****************/

		clearListData: function() {
			const that = this;
			const oView = that.getView();

			sap.m.MessageBox.confirm("Are you sure you want to clear all data?", {
				onClose: function(oAction) {
					var oGlobalDataModel = that.getOwnerComponent().getModel("globalData");
					if (oAction === sap.m.MessageBox.Action.OK) {

						// Clear input fields
						const aInputIds = [
							"_supplierInputId",
							"_financialYearInputId",
							"_quarterInputId",
							"_quarterInputYearId",
							"_supplierDueDatePickerId"
						];

						aInputIds.forEach((sId) => {
							const oControl = that.byId(sId);
							if (oControl) {
								if (oControl.isA("sap.m.DatePicker")) {
									oControl.setDateValue(null);
									oControl.setValueState("None");
								} else if (
									oControl.isA("sap.m.Input") ||
									oControl.isA("sap.m.ComboBox") ||
									oControl.isA("sap.m.Select")
								) {
									oControl.setValue("");
									oControl.setValueState("None");
								}
							}
						});

						// Clear the values bound to the input fields
						oGlobalDataModel.setProperty("/selectedSupplierNamesDisplay", "");
						oGlobalDataModel.setProperty("/selectedSupplierNames", "");
						oGlobalDataModel.setProperty("/selectedSupplierIDs", "");
						oGlobalDataModel.setProperty("/fiscalYears", "");
						oGlobalDataModel.setProperty("/selectedQuarters", "");
						oGlobalDataModel.setProperty("/selectedQuarterYears", "");
						oGlobalDataModel.setProperty("/selectedSupplierDueDate", "");

						// Reset RadioButtonGroup to default
						const oRadioGroup = that.byId("radioBtnlist");
						if (oRadioGroup) {
							oRadioGroup.setSelectedIndex(0); // 0 = Fiscal Year Wise
							that.onRadioButtonSelectList({
								getSource: () => oRadioGroup
							});
						}

						// Reset IconTabBar to default tab (Turnover)
						const oIconTabBar1 = oView.byId("iconTabBar");
						if (oIconTabBar1) {
							oIconTabBar1.setSelectedKey("scenario1");
							that.onTabSelect({
								getParameter: () => "scenario1"
							});
						}

						// Reset IconTabBar to default tab (Supplier Due)
						const oIconTabBar2 = oView.byId("iconTabBarSupplierDue");
						if (oIconTabBar2) {
							oIconTabBar2.setSelectedKey("scenario1");
							that.onTabSelectSupplierDue({
								getParameter: () => "scenario1"
							});
						}

						// Reset IconTabBar to default tab (Supplier Due Qtr/FY)
						const oIconTabBar3 = oView.byId("iconTabBarSupplierDueQtrFy");
						if (oIconTabBar3) {
							oIconTabBar3.setSelectedKey("scenario1");
							that.onTabSelectSupplierDueQtrFY({
								getParameter: () => "scenario1"
							});
						}

						// Reset global data
						that._updateGlobalDataModel();

						// Define model reset map
						const oModelResetMap = {
							// Customer-related models
							allCustlistData: [
								"/allCustlistDataFiscalYearWise",
								"/allCustlistDataQuaterlyWise"
							],
							top10listData: [
								"/top5CustlistDataFiscalYearWise",
								"/top5CustlistDataQuaterlyWise"
							],
							singleCustlistData: [
								"/singleCustlistDataFiscalYearWise",
								"/singleCustlistDataQuaterlyWise"
							],
							quarterlyTurnoverlistData: [
								"/quarterlyTurnoverlistDataFiscalYearWise",
								"/quarterlyTurnoverlistDataQuaterlyWise"
							],

							// Supplier Due models (reset OData results)
							allSupplierDuelistData: ["/"],
							top5SupplierDuelistData: ["/"],
							singleSupplierDuelistData: ["/"],
							totalSupplierDuelistData: ["/"],

							// Supplier Due Qtr/FY models (reset OData results)
							singleSupplierDueQtrFYlistData: ["/"],
							totalSupplierDueQtrFYlistData: ["/"]
						};

						// Reset data in each model
						Object.keys(oModelResetMap).forEach((sModelName) => {
							const oModel = that.getOwnerComponent().getModel(sModelName);
							if (oModel) {
								oModelResetMap[sModelName].forEach((sPath) => {
									oModel.setProperty(sPath, []);
								});
							}
						});
					}
				}
			});
		},

		/*************** chart function & plotting the chart data  *****************/

		/*generateColorMapByFiscalYearWise: function(data, selectedTabText) {
			const colorMap = {};
			let uniqueKeys = [];

			// Choose key format based on selected tab
			if (selectedTabText === "Purchase Turnover") {
				uniqueKeys = [...new Set(data.map(item => item.fiscalYear))];
			} else {
				uniqueKeys = [...new Set(data.map(item => `${item.supplier} (${item.fiscalYear})`))];
			}

			// Generate HSL colors based on index
			uniqueKeys.forEach((key, i) => {
				const color = `hsl(${(i * 43) % 360}, 70%, 50%)`;
				colorMap[key] = color;
			});

			return {
				colorMap
			};
		},
		bindChartColorRulesByFiscalYearWise: function(sFragmentId, oData) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var oSelectedTabText = oGlobalModel.getProperty("/selectedTabText");
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idVizFrame");

			if (!oVizFrame) {
				console.warn("VizFrame not found for Fragment ID:", sFragmentId);
				return;
			}

			var {
				colorMap
			} = this.generateColorMapByFiscalYearWise(oData, oSelectedTabText);

			var rules = [];

			if (oSelectedTabText === "Purchase Turnover") {
				rules = oData.map(item => ({
					dataContext: {
						"Fiscal Year": item.fiscalYear
					},
					properties: {
						color: colorMap[item.fiscalYear]
					}
				}));
			} else {
				rules = oData.map(item => {
					const key = `${item.supplier} (${item.fiscalYear})`;
					return {
						dataContext: {
							"Supplier Name": item.supplier,
							"Fiscal Year": item.fiscalYear
						},
						properties: {
							color: colorMap[key]
						}
					};
				});
			}

			oVizFrame.setVizProperties({
				title: {
					visible: true,
					text: "Fiscal Year Wise Turnover"
				},
				plotArea: {
					dataPointStyle: {
						rules
					},
					dataLabel: {
						visible: true,
					},
					drawingEffect: "glossy"
				},
				tooltip: {
					visible: true
				},
				interaction: {
					selectability: {
						mode: "multiple"
					},
				},
				categoryAxis: {
					label: {
						visible: true,
						allowMultiline: true,
						linesOfWrap: 4,
						overlapBehavior: "wrap",
						rotation: 0,
						angle: 0,
						maxWidth: 200,
						truncatedLabelRatio: 0.9,
						style: {
							fontSize: "10px"
						}
					}
				},
				valueAxis: {
					label: {
						visible: true
					}
				}
			});

			// Use bind to pass sFragmentId and call _onChartSelect
			oVizFrame.attachSelectData(this._onChartSelectFiscalYearWise.bind(this, sFragmentId));

		},
		_onChartSelectFiscalYearWise: function(sFragmentId, oEvent) {
			var oVizFrame = oEvent.getSource();
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idPopOverFiscalYearWise");

			if (!oPopover) {
				console.warn("Popover not found for Fragment ID:", sFragmentId)
				return;
			}

			// Get selected data from the event (it will be in the 'data' parameter of the event)
			var aSelectedData = oEvent.getParameter("data");

			if (!aSelectedData || aSelectedData.length === 0) {
				console.warn("No data selected");
				return;
			}

			// We assume single selection and access the first item in the selected data array
			var oSelectedItem = aSelectedData[0];

			// Directly get the data from the selected item
			var oDataContext = oSelectedItem.data; // Directly access the data (it may not need 'data.data')

			// Assuming you are accessing Supplier Name, Fiscal Year, and Turnover
			var sSupplier = oDataContext["Supplier Name"];
			var sFiscalYear = oDataContext["Fiscal Year"];
			var sTurnover = oDataContext["Turn Over (₹ Cr)"]; // Adjust the field name as necessary

			// Create a JSON model to hold the data for the Popover
			var oPopoverModel = new sap.ui.model.json.JSONModel({
				supplier: sSupplier,
				fiscalYear: sFiscalYear,
				turnover: sTurnover
			});

			// Set the model on the Popover
			oPopover.setModel(oPopoverModel);

			// Connect the Popover to the VizFrame
			oPopover.connect(oVizFrame.getVizUid());
		},
		generateColorMapByQuarterlyWise: function(data, selectedTabText) {
			var colorMap = {};
			var uniqueKeys = [];

			if (selectedTabText === "Purchase Turnover") {
				uniqueKeys = [...new Set(data.map(item => `(${item.quater} ${item.quaterYear})`))];
			} else {
				uniqueKeys = [...new Set(data.map(item => `${item.supplier} (${item.quater} ${item.quaterYear})`))];
			}

			uniqueKeys.forEach(function(key, i) {
				var color = `hsl(${(i * 37) % 360}, 65%, 55%)`;
				colorMap[key] = color;
			});

			return {
				colorMap: colorMap
			};
		},
		bindChartColorRulesByQuarterlyWise: function(sFragmentId, oData) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var oSelectedTabText = oGlobalModel.getProperty("/selectedTabText");
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idVizFrame");

			if (!oVizFrame) {
				console.warn("VizFrame not found for Fragment ID:", sFragmentId);
				return;
			}

			var result = this.generateColorMapByQuarterlyWise(oData, oSelectedTabText);
			var colorMap = result.colorMap;
			var rules = [];

			if (oSelectedTabText === "Purchase Turnover") {
				rules = oData.map(function(item) {
					var key = `(${item.quater} ${item.quaterYear})`;
					return {
						dataContext: {
							"Quarter": item.quater,
							"Quarter Year": item.quaterYear
						},
						properties: {
							color: colorMap[key]
						}
					};
				});
			} else {
				rules = oData.map(function(item) {
					var key = `${item.supplier} (${item.quater} ${item.quaterYear})`;
					return {
						dataContext: {
							"Supplier Name": item.supplier,
							"Quarter": item.quater,
							"Quarter Year": item.quaterYear
						},
						properties: {
							color: colorMap[key]
						}
					};
				});
			}

			oVizFrame.setVizProperties({
				title: {
					visible: true,
					text: "Quaterly Wise Turnover"
				},
				plotArea: {
					dataPointStyle: {
						rules: rules
					},
					dataLabel: {
						visible: true
					},
					drawingEffect: "glossy"
				},
				tooltip: {
					visible: true
				},
				interaction: {
					selectability: {
						mode: "multiple"
					}
				},
				categoryAxis: {
					label: {
						visible: true,
						allowMultiline: true,
						linesOfWrap: 4,
						overlapBehavior: "wrap",
						rotation: 0,
						angle: 0,
						maxWidth: 200,
						truncatedLabelRatio: 0.9,
						style: {
							fontSize: "10px"
						}
					}
				},
				valueAxis: {
					label: {
						visible: true
					}
				}
			});

			// Use bind to pass sFragmentId and call _onChartSelect
			oVizFrame.attachSelectData(this._onChartSelectQuarterlyWise.bind(this, sFragmentId));
		},
		_onChartSelectQuarterlyWise: function(sFragmentId, oEvent) {
			var oVizFrame = oEvent.getSource();
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idPopOverQuaterlyWise");

			if (!oPopover) {
				console.warn("Popover not found for Fragment ID:", sFragmentId);
				return;
			}

			// Get selected data from the event (it will be in the 'data' parameter of the event)
			var aSelectedData = oEvent.getParameter("data");

			if (!aSelectedData || aSelectedData.length === 0) {
				console.warn("No data selected");
				return;
			}

			// We assume single selection and access the first item in the selected data array
			var oSelectedItem = aSelectedData[0];

			// Directly get the data from the selected item
			var oDataContext = oSelectedItem.data; // Directly access the data (it may not need 'data.data')

			// Assuming you are accessing Supplier Name, Quarter, Quarter Year, and Turnover
			var sSupplier = oDataContext["Supplier Name"];
			var sQuarter = oDataContext["Quarter"];
			var sQuarterYear = oDataContext["Quarter Year"];
			var sTurnover = oDataContext["Turn Over (₹ Cr)"]; // Adjust the field name as necessary

			// Create a JSON model to hold the data for the Popover
			var oPopoverModel = new sap.ui.model.json.JSONModel({
				supplier: sSupplier,
				quarter: sQuarter,
				quarterYear: sQuarterYear,
				turnover: sTurnover
			});

			// Set the model on the Popover
			oPopover.setModel(oPopoverModel);

			// Connect the Popover to the VizFrame
			oPopover.connect(oVizFrame.getVizUid());
		},*/

		/*************** chart function & plotting the chart supplier data  *****************/

		/*generateColorMapBySupplierDue: function(data, sSelectedTabTextSupplierDue) {
			const colorMap = {};
			let uniqueKeys = [];

			// Choose key format based on selected tab
			if (sSelectedTabTextSupplierDue === "Total Outstanding") {
				uniqueKeys = [...new Set(data.map(item => item.name1))];
			} else {
				uniqueKeys = [...new Set(data.map(item => `${item.name1}`))];
			}

			// Generate HSL colors based on index
			uniqueKeys.forEach((key, i) => {
				const color = `hsl(${(i * 43) % 360}, 70%, 50%)`;
				colorMap[key] = color;
			});

			return {
				colorMap
			};
		},
		bindChartColorRulesBySupplierDue: function(sFragmentId, oData) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sSelectedTabTextSupplierDue = oGlobalModel.getProperty("/selectedTabTextSupplierDue");
			var oVizFrameSupplierDue = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idVizFrameSupplierDue");

			if (!oVizFrameSupplierDue) {
				console.warn("VizFrame not found for Fragment ID:", sFragmentId);
				return;
			}

			var {
				colorMap
			} = this.generateColorMapBySupplierDue(oData, sSelectedTabTextSupplierDue);

			var rules = [];

			if (sSelectedTabTextSupplierDue === "Total Outstanding") {
				rules = oData.map(item => ({
					dataContext: {
						"Amount": item.amount
					},
					properties: {
						color: colorMap[item.amount]
					}
				}));
			} else {
				rules = oData.map(item => {
					const key = `${item.name1}`;
					return {
						dataContext: {
							"Supplier Name": item.name1,
							
						},
						properties: {
							color: colorMap[key]
						}
					};
				});
			}

			oVizFrameSupplierDue.setVizProperties({
				title: {
					visible: true,
					text: "Supplier Due As on Date"
				},
				plotArea: {
					dataPointStyle: {
						rules
					},
					dataLabel: {
						visible: true,
					},
					drawingEffect: "glossy"
				},
				tooltip: {
					visible: true
				},
				interaction: {
					selectability: {
						mode: "multiple"
					},
				},
				categoryAxis: {
					label: {
						visible: true,
						allowMultiline: true,
						linesOfWrap: 4,
						overlapBehavior: "wrap",
						rotation: 0,
						angle: 0,
						maxWidth: 200,
						truncatedLabelRatio: 0.9,
						style: {
							fontSize: "10px"
						}
					}
				},
				valueAxis: {
					label: {
						visible: true
					}
				}
			});

			// Use bind to pass sFragmentId and call _onChartSelect
			oVizFrameSupplierDue.attachSelectData(this._onChartSelectSupplierDue.bind(this, sFragmentId));

		},
		_onChartSelectSupplierDue: function(sFragmentId, oEvent) {
			var oVizFrameSupplierDue = oEvent.getSource();
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idPopOverAllSupplierDue");

			if (!oPopover) {
				console.warn("Popover not found for Fragment ID:", sFragmentId)
				return;
			}

			// Get selected data from the event (it will be in the 'data' parameter of the event)
			var aSelectedData = oEvent.getParameter("data");

			if (!aSelectedData || aSelectedData.length === 0) {
				console.warn("No data selected");
				return;
			}

			// We assume single selection and access the first item in the selected data array
			var oSelectedItem = aSelectedData[0];

			// Directly get the data from the selected item
			var oDataContext = oSelectedItem.data; 

			// Assuming you are accessing Supplier Name, Fiscal Year, and Turnover
			var sSupplier = oDataContext["Supplier Name"];
			var sAmount = oDataContext["Amount (₹ Cr)"]; 

			// Create a JSON model to hold the data for the Popover
			var oPopoverModel = new sap.ui.model.json.JSONModel({
				supplier: sSupplier,
				amount: sAmount
			});

			// Set the model on the Popover
			oPopover.setModel(oPopoverModel);

			// Connect the Popover to the VizFrame
			oPopover.connect(oVizFrameSupplierDue.getVizUid());
		},*/

		/*************** chart function & plotting the chart supplier data Qtr/FY  *****************/

		/*generateColorMapBySupplierDueQtrFY: function(data, selectedTabText) {
			var colorMap = {};
			var uniqueKeys = [];

			if (selectedTabText === "Total Outstanding") {
				uniqueKeys = [...new Set(data.map(item => `(${item.poper} ${item.gjahr})`))];
			} else {
				uniqueKeys = [...new Set(data.map(item => `${item.name1} (${item.poper} ${item.gjahr})`))];
			}

			uniqueKeys.forEach(function(key, i) {
				var color = `hsl(${(i * 37) % 360}, 65%, 55%)`;
				colorMap[key] = color;
			});

			return {
				colorMap: colorMap
			};
		},
		bindChartColorRulesBySupplierDueQtrFY: function(sFragmentId, oData) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var sSelectedTabTextSupplierDueQtrFY = oGlobalModel.getProperty("/selectedTabTextSupplierDueQtrFY");
			var oVizFrameSupplierDueQtrFY = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idVizFrameSupplierDueQtrFY");

			if (!oVizFrameSupplierDueQtrFY) {
				console.warn("VizFrame not found for Fragment ID:", sFragmentId);
				return;
			}

			var result = this.generateColorMapBySupplierDueQtrFY(oData, sSelectedTabTextSupplierDueQtrFY);
			var colorMap = result.colorMap;
			var rules = [];

			if (sSelectedTabTextSupplierDueQtrFY === "Total Outstanding") {
				rules = oData.map(function(item) {
					var key = `(${item.poper} ${item.gjahr})`;
					return {
						dataContext: {
							"Quarter": item.poper,
							"Quarter Year": item.gjahr
						},
						properties: {
							color: colorMap[key]
						}
					};
				});
			} else {
				rules = oData.map(function(item) {
					var key = `${item.name1} (${item.poper} ${item.gjahr})`;
					return {
						dataContext: {
							"Supplier Name": item.name1,
							"Quarter": item.poper,
							"Quarter Year": item.gjahr
						},
						properties: {
							color: colorMap[key]
						}
					};
				});
			}

			oVizFrameSupplierDueQtrFY.setVizProperties({
				title: {
					visible: true,
					text: "Supplier Due As on Date Qtr/FY"
				},
				plotArea: {
					dataPointStyle: {
						rules: rules
					},
					dataLabel: {
						visible: true
					},
					drawingEffect: "glossy"
				},
				tooltip: {
					visible: true
				},
				interaction: {
					selectability: {
						mode: "multiple"
					}
				},
				categoryAxis: {
					label: {
						visible: true,
						allowMultiline: true,
						linesOfWrap: 4,
						overlapBehavior: "wrap",
						rotation: 0,
						angle: 0,
						maxWidth: 200,
						truncatedLabelRatio: 0.9,
						style: {
							fontSize: "10px"
						}
					}
				},
				valueAxis: {
					label: {
						visible: true
					}
				}
			});

			// Use bind to pass sFragmentId and call _onChartSelect
			oVizFrameSupplierDueQtrFY.attachSelectData(this._onChartSelectSupplierDueQtrFY.bind(this, sFragmentId));
		},
		_onChartSelectSupplierDueQtrFY: function(sFragmentId, oEvent) {
			var oVizFrameSupplierDueQtrFY = oEvent.getSource();
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idPopOverAllSupplierDueQtrFY");

			if (!oPopover) {
				console.warn("Popover not found for Fragment ID:", sFragmentId);
				return;
			}

			// Get selected data from the event (it will be in the 'data' parameter of the event)
			var aSelectedData = oEvent.getParameter("data");

			if (!aSelectedData || aSelectedData.length === 0) {
				console.warn("No data selected");
				return;
			}

			// We assume single selection and access the first item in the selected data array
			var oSelectedItem = aSelectedData[0];

			// Directly get the data from the selected item
			var oDataContext = oSelectedItem.data; // Directly access the data (it may not need 'data.data')

			// Assuming you are accessing Supplier Name, Quarter, Quarter Year, and Turnover
			var sSupplier = oDataContext["Supplier Name"];
			var sQuarter = oDataContext["Quarter"];
			var sQuarterYear = oDataContext["Quarter Year"];
			var sAmount = oDataContext["Amount (₹ Cr)"]; // Adjust the field name as necessary

			// Create a JSON model to hold the data for the Popover
			var oPopoverModel = new sap.ui.model.json.JSONModel({
				supplier: sSupplier,
				quarter: sQuarter,
				quarterYear: sQuarterYear,
				amount: sAmount
			});

			// Set the model on the Popover
			oPopover.setModel(oPopoverModel);

			// Connect the Popover to the VizFrame
			oPopover.connect(oVizFrameSupplierDueQtrFY.getVizUid());
		},*/

	});
});