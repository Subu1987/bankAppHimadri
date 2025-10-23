sap.ui.define([
	"com/infocus/ZBankApp/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/viz/ui5/api/env/Format",
	"com/infocus/ZBankApp/libs/html2pdf.bundle",
	"jquery.sap.global"
], function(BaseController, Fragment, Filter, FilterOperator, JSONModel, MessageBox, Format, html2pdf_bundle, jQuery) {
	"use strict";

	return BaseController.extend("com.infocus.ZBankApp.controller.Home", {

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
			this.getBankAccountMasterParametersData();
			this.getCompanyCodeMasterParametersData();
		},
		_updateGlobalDataModel: function() {
			var oGlobalDataModel = this.getOwnerComponent().getModel("globalData");
			if (!oGlobalDataModel) {
				console.error("Global data model is not available.");
				sap.m.MessageToast.show("Unable to access global data model.");
				return;
			}

			if (oGlobalDataModel) {
				oGlobalDataModel.setProperty("/selectedTabText", "Incoming & Outgoing GL(Monthly)");
				oGlobalDataModel.setProperty("/selectedGLType", "A");
				oGlobalDataModel.setProperty("/selectedOption", "3");

			} else {
				console.error("Global data model is not available.");
			}
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

		getCompanyCodeMasterParametersData: function() {
			var that = this;
			var oModel = this.getOwnerComponent().getModel("parameterMasterModel");
			var oCompanyCodeMasterModel = this.getOwnerComponent().getModel("companyCodeMasterData");
			var sUrl = "/KeydetailsSet";

			return new Promise(function(resolve, reject) {
				if (!oModel || !oCompanyCodeMasterModel) {
					reject("Could not access required models for fetching Company Code data.");
					return;
				}

				// Create OData filter: option eq '1'
				var oFilter = new sap.ui.model.Filter("option", sap.ui.model.FilterOperator.EQ, "1");

				oModel.read(sUrl, {
					filters: [oFilter],
					success: function(oResponse) {
						var aResults = oResponse && oResponse.results ? oResponse.results : [];
						oCompanyCodeMasterModel.setData(aResults || []);
						console.log("✅ Company Code master data loaded:", aResults);
						resolve(aResults);
					},
					error: function(oError) {
						console.error("❌ Error fetching Company Code master data:", oError);
						reject("Failed to fetch Company Code master data.");
					}
				});
			});
		},
		getBankAccountMasterParametersData: function() {
			var that = this;
			var oParameterModel = this.getOwnerComponent().getModel("parameterMasterModel");
			var oBankAccountMasterModel = this.getOwnerComponent().getModel("bankAccountMasterData");
			var sUrl = "/KeydetailsSet";

			return new Promise(function(resolve, reject) {
				if (!oParameterModel || !oBankAccountMasterModel) {
					reject("Could not access required models for fetching Bank Account data.");
					return;
				}

				// Create OData filter: option eq '1'
				var oFilter = new sap.ui.model.Filter("option", sap.ui.model.FilterOperator.EQ, "2");

				oParameterModel.read(sUrl, {
					filters: [oFilter],
					success: function(oResponse) {
						var aResults = oResponse && oResponse.results ? oResponse.results : [];
						oBankAccountMasterModel.setData(aResults || []);
						console.log("✅ Bank Account data loaded:", aResults);
						resolve(aResults);
					},
					error: function(oError) {
						console.error("❌ Error fetching  Bank Account master data:", oError);
						reject("Failed to fetch Bank Account master data.");
					}
				});
			});
		},
		
		/*************** radio Button & drop down selection  *****************/

		onRadioButtonSelectPeriod: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var oSelectedIndex = oEvent.getParameter("selectedIndex");
			var oMonthBox = this.byId("monthSelectionBox");
			var oQuarterBox = this.byId("quarterSelectionBox");

			if (oSelectedIndex === 0) { // Monthly selected
				oMonthBox.setVisible(true);
				oQuarterBox.setVisible(false);
				oGlobalModel.setProperty("/selectedOption", "3");
			} else if (oSelectedIndex === 1) { // Quarterly selected
				oMonthBox.setVisible(false);
				oQuarterBox.setVisible(true);
				oGlobalModel.setProperty("/selectedOption", "4");
			}
		},
		onRadioButtonSelectGL: function(oEvent) {
			var oGlobalModel = this.getOwnerComponent().getModel("globalData");
			var oSelectedIndex = oEvent.getParameter("selectedIndex");
			var oIncomingOutgoingPanel = this.byId("panelIncomingOutgoingViewBox");
			var oMainGLPanel = this.byId("panelMainViewBox");

			if (oSelectedIndex === 0) {
				oIncomingOutgoingPanel.setVisible(true);
				oMainGLPanel.setVisible(false);
				oGlobalModel.setProperty("/selectedGLType", "A");
				oGlobalModel.setProperty("/selectedTabText", "Incoming & Outgoing GL(Monthly)");
			} else {
				oIncomingOutgoingPanel.setVisible(false);
				oMainGLPanel.setVisible(true);
				oGlobalModel.setProperty("/selectedGLType", "B");
				oGlobalModel.setProperty("/selectedTabText", "Main GL(Monthly)");
			}

		},

		/*************** get the Backend data for GL  *****************/

		_buildGLFilters: function () {
                var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
                var filters = [];
            
                var {
                    selectedGLType,
                    selectedOption,
                    selectedCompanyCode,
                    selectedFiscalYear,
                    selectedBankAccount,
                    selectedMonth,
                    selectedQuarter
                } = oGlobalData;
            
                var Filter = sap.ui.model.Filter;
                var FilterOperator = sap.ui.model.FilterOperator;
            
                // Helper to always add filters (even for empty values)
                var addFilter = (path, value) => {
                    filters.push(new Filter(path, FilterOperator.EQ, value || ""));
                };
            
                // 🔹 Common filters
                addFilter("bukrs", selectedCompanyCode);
                addFilter("gjahr", selectedFiscalYear);
                addFilter("bank_name", selectedBankAccount);
            
                // 🔹 Conditional filters for GL Type & Option
                if (["A", "B"].includes(selectedGLType) && ["3", "4"].includes(selectedOption)) {
                    var isMonthly = selectedOption === "3";
            
                    // Always include both period & quarter (even if one is empty)
                    addFilter("period", isMonthly ? selectedMonth : "");
                    addFilter("quarter", isMonthly ? "" : selectedQuarter);
                    addFilter("checkbox", selectedGLType);
                    addFilter("option", selectedOption);
                }
            
                return filters;
            },
		getGLBackendData: function() {
			var oModel = this.getOwnerComponent().getModel();
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();
			var oGLlistModel = this.getOwnerComponent().getModel("GLMasterData");
			var filters = this._buildGLFilters();

			sap.ui.core.BusyIndicator.show();

			oModel.read("/GLBalanceSet", {
				filters,
				success: (response) => {
					var oData = response.results || [];
					console.log("GL Data:", oData);
                    
                    if(oGlobalData.selectedGLType === "A"){
                        oGLlistModel.setProperty("/inOutGLData", oData);
                    }else{
                        oGLlistModel.setProperty("/mainGLData", oData);
                    }
					
					console.log(oGLlistModel);
					sap.ui.core.BusyIndicator.hide();

					if (!oData.length) {
						sap.m.MessageBox.information("There are no data available!");
					}
				},
				error: (error) => {
					sap.ui.core.BusyIndicator.hide();
					console.error(error);

					try {
						var errorMsg = JSON.parse(error.responseText).error.message.value;
						sap.m.MessageBox.error(errorMsg);
					} catch {
						sap.m.MessageBox.error("An unexpected error occurred.");
					}
				}
			});
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
			var words = item.supplier.split(" ");
			var abbreviation = words
				.filter(w => w.length > 2 && w[0] === w[0].toUpperCase())
				.map(w => w[0])
				.join("")
				.toUpperCase();

			/*item.supplierShort = abbreviation || item.supplier;*/
			item.supplierShort = item.supplier;
		},

		/*************** Clear data from all input fields,radio button & model make it default  *****************/

		clearListData: function() {
			var that = this;
			var oView = that.getView();

			sap.m.MessageBox.confirm("Are you sure you want to clear all data?", {
				onClose: function(oAction) {
					var oGlobalDataModel = that.getOwnerComponent().getModel("globalData");
					if (oAction === sap.m.MessageBox.Action.OK) {

						// Clear input fields
						var aInputIds = [
							"_companyCodeInputId",
							"_VenderInputId",
							"_venderDatePickerId"
						];

						aInputIds.forEach((sId) => {
							var oControl = that.byId(sId);
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
						var oModelResetMap = {

							// Supplier Due models (reset OData results)
							venderMasterData: ["/"],
							companyCodeMasterData: ["/"],
							globalData: ["/"],
							venderHistoryData: ["/"]

						};

						// Reset data in each model
						Object.keys(oModelResetMap).forEach((sModelName) => {
							var oModel = that.getOwnerComponent().getModel(sModelName);
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

		/*************** chart function & plotting the chart Incoming & Outgoing GL data  *****************/

		generateColorMapByIncomingOutgoingGL: function(data, sSelectedTabTextSupplierDue) {
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
		bindChartColorRulesByIncomingOutgoingGL: function(sFragmentId, oData) {
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
							/*"Amount": item.amount*/
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
			/*oVizFrameSupplierDue.attachSelectData(this._onChartSelectSupplierDue.bind(this, sFragmentId));*/

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
			var oDataContext = oSelectedItem.data; // Directly access the data (it may not need 'data.data')

			// Assuming you are accessing Supplier Name, Fiscal Year, and Turnover
			var sSupplier = oDataContext["Supplier Name"];
			var sAmount = oDataContext["Amount (₹ Cr)"]; // Adjust the field name as necessary

			// Create a JSON model to hold the data for the Popover
			var oPopoverModel = new sap.ui.model.json.JSONModel({
				supplier: sSupplier,
				amount: sAmount
			});

			// Set the model on the Popover
			oPopover.setModel(oPopoverModel);

			// Connect the Popover to the VizFrame
			oPopover.connect(oVizFrameSupplierDue.getVizUid());
		},

	});
});