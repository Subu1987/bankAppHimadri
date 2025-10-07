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
			} catch (err) {
				console.error("Error initializing the app:", err);
				sap.m.MessageBox.error("An error occurred during app initialization. Please contact support.");
			}
		},
		_initializeAppData: function() {
			var that = this;
			sap.ui.core.BusyIndicator.show(); // Show busy once

			// Load both datasets in parallel
			Promise.all([
					/*this.getVenderMasterParametersData(),*/
					this.getCompanyCodeMasterParametersData()
				])
				.then(function() {
					console.log("All master data loaded successfully.");
				})
				.catch(function(err) {
					console.error("Error loading initial data:", err);
					sap.m.MessageBox.error(err);
				})
				.finally(function() {
					sap.ui.core.BusyIndicator.hide(); // Hide busy after all done
				});
		},

		/*************** validate Inputs *****************/
		validateInputs: function() {
			var oView = this.getView();

			// Friendly field names
			var mFieldNames = {
				"_companyCodeInputId": "Company Code",
				"_VenderInputId": "Vendor Code",
				"_venderDatePickerId": "Due Date"
			};

			var aInputIds = ["_companyCodeInputId", "_VenderInputId", "_venderDatePickerId"];
			var bAllValid = true;
			var aEmptyFields = [];

			aInputIds.forEach(function(sId) {
				var oInput = oView.byId(sId);
				if (oInput && oInput.getVisible && oInput.getVisible()) {
					var sFieldName = mFieldNames[sId] || sId;
					var bValid = true;

					if (oInput.getDateValue && typeof oInput.getDateValue === "function") {
						var oDate = oInput.getDateValue();
						if (!oDate || Object.prototype.toString.call(oDate) !== "[object Date]" || isNaN(oDate.getTime())) {
							bValid = false;
							oInput.setValueState("Error");
							oInput.setValueStateText("Please select a valid date.");
						} else {
							oInput.setValueState("None");
						}
					} else if (oInput.getValue && typeof oInput.getValue === "function") {
						var sValue = oInput.getValue() ? oInput.getValue().trim() : "";
						if (!sValue) {
							bValid = false;
							oInput.setValueState("Error");
							oInput.setValueStateText("This field cannot be empty.");
						} else {
							oInput.setValueState("None");
						}
					} else {
						var sText = oInput.getText ? oInput.getText() : "";
						if (!sText) {
							bValid = false;
							oInput.setValueState("Error");
							oInput.setValueStateText("This field cannot be empty.");
						} else {
							oInput.setValueState("None");
						}
					}

					if (!bValid) {
						bAllValid = false;
						aEmptyFields.push(sFieldName);
					}
				}
			});

			if (aEmptyFields.length > 0) {
				sap.m.MessageBox.error("Please fill/choose the following fields:\n\n" + aEmptyFields.join("\n"));
			}

			return bAllValid;
		},

		/*************** get parameters data *****************/

		getVenderMasterParametersData: function() {
			var that = this;
			var oModel = this.getOwnerComponent().getModel();
			var oVenderMasterModel = this.getOwnerComponent().getModel("venderMasterData");
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var aSelectedCompanyCodes = oGlobalData.selectedCompanyCodeIDs || [];
			var sUrl = "/es_f4lifnrset";

			return new Promise(function(resolve, reject) {
				if (!oModel || !oVenderMasterModel) {
					reject("Could not access required models for fetching Vender data.");
					return;
				}

				// Apply filter (bukrs eq '1100')
				var aFilters = [
					new sap.ui.model.Filter("bukrs", sap.ui.model.FilterOperator.EQ, aSelectedCompanyCodes[0])
				];

				oModel.read(sUrl, {
					filters: aFilters,
					success: function(oResponse) {
						var aResults = oResponse && oResponse.results ? oResponse.results : [];
						aResults.sort(function(a, b) {
							return parseInt(a.lifnr, 10) - parseInt(b.lifnr, 10);
						});
						oVenderMasterModel.setData(aResults || []);
						console.log("Vender master data loaded:", aResults);
						resolve();
					},
					error: function(oError) {
						console.error("Error fetching Vender master data:", oError);
						reject("Failed to fetch Vender master data.");
					}
				});
			});
		},
		getCompanyCodeMasterParametersData: function() {
			var that = this;
			var oModel = this.getOwnerComponent().getModel();
			var oCompanyCodeMasterModel = this.getOwnerComponent().getModel("companyCodeMasterData");
			var sUrl = "/es_f4bukrsset";

			return new Promise(function(resolve, reject) {
				if (!oModel || !oCompanyCodeMasterModel) {
					reject("Could not access required models for fetching Company Code data.");
					return;
				}

				oModel.read(sUrl, {
					success: function(oResponse) {
						var aResults = oResponse && oResponse.results ? oResponse.results : [];
						oCompanyCodeMasterModel.setData(aResults || []);
						console.log("Company Code master data loaded:", aResults);
						resolve();
					},
					error: function(oError) {
						console.error("Error fetching Company Code master data:", oError);
						reject("Failed to fetch Company Code master data.");
					}
				});
			});
		},

		/*************** Fragment handling *****************/

		handleValueVenderMaster: function(oEvent) {
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var aSelectedCompanyCodes = oGlobalData.selectedCompanyCodeIDs || [];

			if (!aSelectedCompanyCodes.length) {
				sap.m.MessageBox.error("Please select a Company Code before choosing a Vendor.");
				return;
			}

			var that = this;
			this._VenderInputId = oEvent.getSource().getId();
			var oVenderMasterModel = this.getOwnerComponent().getModel("venderMasterData");

			// Lazy-load dialog if not already created
			if (!this._oVenderMasterDialog) {
				this._oVenderMasterDialog = sap.ui.xmlfragment(
					this.getView().getId() + "VenderMasterDialog",
					"com.infocus.venderApp.view.dialogComponent.DialogVenderMaster",
					this
				);
				this._oVenderMasterDialog.setModel(oVenderMasterModel);
				this.getView().addDependent(this._oVenderMasterDialog);
			}

			// Step 1: Show global busy indicator
			sap.ui.core.BusyIndicator.show(0); // 0 = immediately

			// Step 2: Normalize model data
			var aExistingData = oVenderMasterModel.getData();
			if (!Array.isArray(aExistingData)) {
				if (aExistingData && typeof aExistingData === "object") {
					aExistingData = Object.values(aExistingData);
				} else {
					aExistingData = [];
				}
			}

			// Step 3: Check if data for selected company exists
			var bDataForSelectedCompany = false;
			for (var i = 0; i < aExistingData.length; i++) {
				if (aExistingData[i].bukrs === aSelectedCompanyCodes[0]) {
					bDataForSelectedCompany = true;
					break;
				}
			}

			// Step 4: Fetch data only if needed
			var pData = (aExistingData.length === 0 || !bDataForSelectedCompany) ? this.getVenderMasterParametersData() : Promise.resolve();

			pData
				.then(function() {
					that._oVenderMasterDialog.open();
				})
				.catch(function(err) {
					sap.m.MessageBox.error(err);
				})
				.finally(function() {
					sap.ui.core.BusyIndicator.hide(); // hide global busy
				});
		},
		handleValueCompanyCodeMaster: function(oEvent) {
			var that = this;
			this._CompanyCodeInputId = oEvent.getSource().getId();
			var oCompanyCodeMasterModel = this.getOwnerComponent().getModel("companyCodeMasterData");

			if (!this._oCompanyCodeMasterDialog) {
				this._oCompanyCodeMasterDialog = sap.ui.xmlfragment(
					this.getView().getId() + "CompanyCodeMasterDialog",
					"com.infocus.venderApp.view.dialogComponent.DialogCompanyCodeMaster",
					this
				);
				this._oCompanyCodeMasterDialog.setModel(oCompanyCodeMasterModel);
				this.getView().addDependent(this._oCompanyCodeMasterDialog);
			}

			// Show global busy indicator
			sap.ui.core.BusyIndicator.show(0);

			var aExistingData = oCompanyCodeMasterModel.getData();
			if (!Array.isArray(aExistingData)) {
				if (aExistingData && typeof aExistingData === "object") {
					aExistingData = Object.values(aExistingData);
				} else {
					aExistingData = [];
				}
			}

			var pData = (aExistingData.length === 0) ? this.getCompanyCodeMasterParametersData() : Promise.resolve();

			pData
				.then(function() {
					that._oCompanyCodeMasterDialog.open();
				})
				.catch(function(err) {
					sap.m.MessageBox.error(err);
				})
				.finally(function() {
					sap.ui.core.BusyIndicator.hide();
				});
		},

		/*************** search value within fragment *****************/

		onSearchVenderMaster: function(oEvent) {
			var sQuery = oEvent.getParameter("newValue");

			// Get the correct fragment ID
			var sFragmentId = this.getView().getId() + "VenderMasterDialog";

			var oList = Fragment.byId(sFragmentId, "idVenderMasterList");
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
		onSearchCompanyCodeMaster: function(oEvent) {
			var sQuery = oEvent.getParameter("newValue");

			// Get the correct fragment ID
			var sFragmentId = this.getView().getId() + "CompanyCodeMasterDialog";

			var oList = Fragment.byId(sFragmentId, "idCompanyCodeMasterList");
			if (!oList) return;

			var oBinding = oList.getBinding("items");
			if (!oBinding) return;

			var aFilters = [];
			if (sQuery) {
				var oFilter1 = new sap.ui.model.Filter("bukrs", sap.ui.model.FilterOperator.Contains, sQuery);
				var oFilter2 = new sap.ui.model.Filter("butxt", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(new sap.ui.model.Filter({
					filters: [oFilter1, oFilter2],
					and: false
				}));
			}

			oBinding.filter(aFilters);
		},

		/*************** set the each property to globalData & reflect data in input field & Date Picker *****************/

		onToggleSelectAll: function(oEvent) {
			var oButton = oEvent.getSource();
			var sFragmentId = this.getView().getId() + "VenderMasterDialog";
			var oList = Fragment.byId(sFragmentId, "idVenderMasterList");

			if (!oList) return;

			var bSelectAll = oButton.getText() === "Select All";
			oList.getItems().forEach(function(oItem) {
				oItem.setSelected(bSelectAll);
			});

			// Update button text
			oButton.setText(bSelectAll ? "Deselect All" : "Select All");

			// Update global model with new selections
			this._updateSelectedVenders(oList);
		},
		onSelectionChangeVenderMaster: function(oEvent) {
			var oList = oEvent.getSource();
			this._updateSelectedVenders(oList);
		},
		_updateSelectedVenders: function(oList) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var aSelectedVenderIDs = [];
			var aSelectedVenderNames = [];

			var aAllItems = oList.getItems();
			aAllItems.forEach(function(oItem) {
				if (oItem.getSelected()) {
					aSelectedVenderIDs.push(oItem.getTitle());
					aSelectedVenderNames.push(oItem.getDescription());
				}
			});

			// ✅ Always update the global model with current selection
			oGlobalModel.setProperty("/selectedVenderNames", aSelectedVenderNames);
			oGlobalModel.setProperty("/selectedVenderIDs", aSelectedVenderIDs);
			oGlobalModel.setProperty("/selectedVenderNamesDisplay", aSelectedVenderIDs.join(", "));

			// 🔄 Sync button text with selection state
			var sFragmentId = this.getView().getId() + "VenderMasterDialog";
			var oSelectAllBtn = Fragment.byId(sFragmentId, "idSelectAllBtn");

			if (oSelectAllBtn) {
				if (aAllItems.length > 0 && aSelectedVenderIDs.length === aAllItems.length) {
					oSelectAllBtn.setText("Deselect All");
				} else {
					oSelectAllBtn.setText("Select All");
				}
			}
		},
		onConfirmVenderMaster: function() {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");

			var aSelectedNamesDisplay = oGlobalModel.getProperty("/selectedVenderNamesDisplay") || "";
			var aSelectedNames = oGlobalModel.getProperty("/selectedVenderNames") || [];
			var aSelectedIDs = oGlobalModel.getProperty("/selectedVenderIDs") || [];

			console.log("Confirmed selected IDs:", aSelectedIDs);
			console.log("Confirmed selected Names:", aSelectedNames);
			console.log("Confirmed selected Display Names:", aSelectedNamesDisplay);

			oGlobalModel.refresh(true);

			this._resetVenderMasterDialog();
			this._oVenderMasterDialog.close();
		},
		onCloseVenderMaster: function() {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			oGlobalModel.setProperty("/selectedVenderIDs", []);
			oGlobalModel.setProperty("/selectedVenderNames", []);
			oGlobalModel.setProperty("/selectedVenderNamesDisplay", "");

			this._resetVenderMasterDialog();
			this._oVenderMasterDialog.close();
		},
		_resetVenderMasterDialog: function() {
			var sFragmentId = this.getView().getId() + "VenderMasterDialog";
			var oList = Fragment.byId(sFragmentId, "idVenderMasterList");
			var oSearchField = Fragment.byId(sFragmentId, "idVenderSearchField");
			var oSelectAllBtn = Fragment.byId(sFragmentId, "idSelectAllBtn");

			// Clear Search
			if (oSearchField) {
				oSearchField.setValue("");
				this.onSearchVenderMaster({
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

			// Reset button text
			if (oSelectAllBtn) {
				oSelectAllBtn.setText("Select All");
			}
		},

		onSelectionChangeCompanyCodeMaster: function(oEvent) {
			var oList = oEvent.getSource();
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var aSelectedCompanyCodeIDs = oGlobalModel.getProperty("/selectedCompanyCodeIDs") || [];
			var aSelectedCompanyCodeNames = oGlobalModel.getProperty("/selectedCompanyCodeNames") || [];

			var aAllItems = oList.getItems();
			aAllItems.forEach(function(oItem) {
				var sID = oItem.getTitle();
				var sName = oItem.getDescription();

				// If item is selected
				if (oItem.getSelected()) {
					if (!aSelectedCompanyCodeIDs.includes(sID)) {
						aSelectedCompanyCodeIDs.push(sID);
						aSelectedCompanyCodeNames.push(sName);
					}
				} else {
					// If item is unselected
					var index = aSelectedCompanyCodeIDs.indexOf(sID);
					if (index !== -1) {
						aSelectedCompanyCodeIDs.splice(index, 1);
						aSelectedCompanyCodeNames.splice(index, 1);
					}
				}
			});

			oGlobalModel.setProperty("/selectedCompanyCodeNames", aSelectedCompanyCodeNames);
			oGlobalModel.setProperty("/selectedCompanyCodeIDs", aSelectedCompanyCodeIDs);
			oGlobalModel.setProperty("/selectedCompanyCodeNamesDisplay", aSelectedCompanyCodeIDs.join(", "));
		},
		onConfirmCompanyCodeMaster: function() {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");

			// Values are already being maintained correctly in the model
			var aSelectedNamesDisplay = oGlobalModel.getProperty("/selectedCompanyCodeNamesDisplay") || "";
			var aSelectedNames = oGlobalModel.getProperty("/selectedCompanyCodeNames") || [];
			var aSelectedIDs = oGlobalModel.getProperty("/selectedCompanyCodeIDs") || [];

			// You can now directly use these for any processing or display
			console.log("Confirmed selected IDs:", aSelectedIDs);
			console.log("Confirmed selected Names:", aSelectedNames);
			console.log("Confirmed selected Display Names:", aSelectedNamesDisplay);

			oGlobalModel.refresh(true);

			this._resetCompanyCodeMasterDialog();
			this._oCompanyCodeMasterDialog.close();
		},
		onCloseCompanyCodeMaster: function() {
			// Clear global model selections
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			oGlobalModel.setProperty("/selectedCompanyCodeIDs", []);
			oGlobalModel.setProperty("/selectedCompanyCodeNames", []);
			oGlobalModel.setProperty("/selectedCompanyCodeNamesDisplay", "");

			this._resetCompanyCodeMasterDialog();
			this._oCompanyCodeMasterDialog.close();
		},
		_resetCompanyCodeMasterDialog: function() {
			// Get the correct fragment ID
			var sFragmentId = this.getView().getId() + "CompanyCodeMasterDialog";

			var oList = Fragment.byId(sFragmentId, "idCompanyCodeMasterList");
			var oSearchField = Fragment.byId(sFragmentId, "idCompanyCodeSearchField");

			// Clear Search
			if (oSearchField) {
				oSearchField.setValue("");

				// Manually trigger the liveChange event handler with empty value
				this.onSearchCompanyCodeMaster({
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

		onVenderDateChange: function(oEvent) {
			var oDatePicker = oEvent.getSource();
			var sValue = oEvent.getParameter("value"); // formatted as yyyyMMdd (because of valueFormat)
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");

			if (!sValue) {
				// If cleared, reset the model value
				oGlobalModel.setProperty("/selectedVenderDate", null);
				return;
			}

			// Optional: validate date
			var oDate = oDatePicker.getDateValue();
			if (!oDate) {
				sap.m.MessageToast.show("Invalid date selected. Please try again.");
				oGlobalModel.setProperty("/selectedVenderDate", null);
				return;
			}

			// Store in model (already yyyyMMdd due to valueFormat)
			oGlobalModel.setProperty("/selectedVenderDate", sValue);
		},

		/*************** get the Backend data for Vender  *****************/

		getVendorHistoryBackendData: function() {
			var that = this;
			// Check Input Validation
			if (!this.validateInputs()) {
				return;
			}

			var oModel = this.getOwnerComponent().getModel();
			var oVendorHistoryModel = this.getOwnerComponent().getModel("venderHistoryData");
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();

			if (!oModel || !oVendorHistoryModel || !oGlobalData) {
				console.error("Required models are not available.");
				sap.m.MessageBox.error("Could not access required models for fetching vendor history data.");
				return;
			}

			var sCompanyCode = oGlobalData.selectedCompanyCodeIDs || [];
			var sVenderCode = oGlobalData.selectedVenderIDs || [];
			var sVenderDate = oGlobalData.selectedVenderDate;

			// Build filters
			var aFilters = this._buildVendorHistoryFilters(sCompanyCode, sVenderCode, sVenderDate);

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

					// Convert values for each item
					aResults = aResults.map(function(item) {
						return that.convertValuesToLacs(item); // 👈 use the helper
					});

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
		_buildVendorHistoryFilters: function(sCompanyCode, aVenderCodes, sVenderDate) {
			var aFilters = [];

			// Company Code filter
			if (sCompanyCode) {
				aFilters.push(new sap.ui.model.Filter("bukrs", sap.ui.model.FilterOperator.EQ, sCompanyCode));
			}

			// Vendor filter (multiple OR conditions)
			if (aVenderCodes && aVenderCodes.length > 0) {
				var aVendorFilters = aVenderCodes.map(function(sCode) {
					return new sap.ui.model.Filter("lifnr", sap.ui.model.FilterOperator.EQ, sCode);
				});

				// OR condition for vendors
				aFilters.push(new sap.ui.model.Filter({
					filters: aVendorFilters,
					and: false
				}));
			}

			// Date filter
			if (sVenderDate) {
				aFilters.push(new sap.ui.model.Filter("budat", sap.ui.model.FilterOperator.LE, sVenderDate));
			}

			return aFilters;
		},

		/*************** helper function  *****************/

		sortByTurnOverDesc: function(aData) {
			return aData.sort(function(a, b) {
				return parseFloat(b.turnOver) - parseFloat(a.turnOver);
			});
		},
		convertValuesToLacs: function(item) {
			// Fields that need to be converted
			var aFieldsToConvert = [
				"netpr", "wrbtr", "netwr", "vend_adv",
				"creditor", "lc", "factoring", "rxil", "abg", "pbg"
			];

			aFieldsToConvert.forEach(function(field) {
				if (item[field] !== undefined && item[field] !== null && !isNaN(item[field])) {
					var lacValue = parseFloat(item[field]) / 100000; // Convert to Lacs
					item[field] = parseFloat(lacValue).toFixed(2); // Round to 2 decimals
				}
			});

			return item;
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
							"_companyCodeInputId",
							"_VenderInputId",
							"_venderDatePickerId"
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
						oGlobalDataModel.setProperty("/selectedVenderNamesDisplay", "");
						oGlobalDataModel.setProperty("/selectedVenderNames", "");
						oGlobalDataModel.setProperty("/selectedVenderIDs", "");
						oGlobalDataModel.setProperty("/selectedCompanyCodeNamesDisplay", "");
						oGlobalDataModel.setProperty("/selectedCompanyCodeNames", "");
						oGlobalDataModel.setProperty("/selectedCompanyCodeIDs", "");

						// Define model reset map
						const oModelResetMap = {

							// Supplier Due models (reset OData results)
							venderMasterData: ["/"],
							companyCodeMasterData: ["/"],
							globalData: ["/"],
							venderHistoryData: ["/"]

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

	});
});