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

			// Restore the last selected theme when the app starts
			// var oCore = sap.ui.getCore();
			// // var sSavedTheme = localStorage.getItem("selectedTheme") || "sap_fiori_3";
			// var sSavedTheme = "sap_fiori_3_dark";
			// oCore.applyTheme(sSavedTheme);

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

				// When Incoming/Outgoing Radio Button Selected
				oGlobalDataModel.setProperty("/isChartFragment1Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment2Visible", false);
				oGlobalDataModel.setProperty("/isChartFragment3Visible", false);

				// When Main GL Radio Button Selected
				oGlobalDataModel.setProperty("/isChartFragment4Visible", true);
				oGlobalDataModel.setProperty("/isChartFragment5Visible", false);
				oGlobalDataModel.setProperty("/isChartFragment6Visible", false);

			} else {
				console.error("Global data model is not available.");
			}
		},
		// onToggleTheme: function() {
		// 	var oCore = sap.ui.getCore();
		// 	var oButton = this.byId("themeToggleBtn");

		// 	// Define light and dark themes
		// 	var sLightTheme = "sap_fiori_3";
		// 	var sDarkTheme = "sap_fiori_3_dark";

		// 	// Get current theme
		// 	var sCurrentTheme = oCore.getConfiguration().getTheme();

		// 	// Determine next theme
		// 	var bIsLight = sCurrentTheme === sLightTheme;
		// 	var sNewTheme = bIsLight ? sDarkTheme : sLightTheme;

		// 	// Apply theme
		// 	oCore.applyTheme(sNewTheme);

		// 	// Update icon & color immediately for user feedback
		// 	if (oButton) {
		// 		oButton.setIcon("sap-icon://lightbulb");
		// 		oButton.removeStyleClass("lightModeIcon darkModeIcon");
		// 		oButton.addStyleClass(bIsLight ? "darkModeIcon" : "lightModeIcon");
		// 	}

		// 	// Save the theme so it persists on refresh
		// 	localStorage.setItem("selectedTheme", sNewTheme);
		// },

		/*************** validate Inputs *****************/
		validateInputs: function() {
			var oView = this.getView();
			var oGlobalData = this.getOwnerComponent().getModel("globalData").getData();

			// 🔹 Map field IDs to user-friendly labels
			var mFieldNames = {
				"_companyCodeComboBoxId": "Company Code",
				"_fiscalYearComboBoxId": "Fiscal Year",
				"_bankAccountComboBoxId": "Bank Account",
				"_monthComboBoxId": "Month",
				"_quarterComboBoxId": "Quarter"
			};

			// 🔹 Always validate these three
			var aInputIds = [
				"_companyCodeComboBoxId",
				"_fiscalYearComboBoxId",
				"_bankAccountComboBoxId"
			];

			// 🔹 Conditionally validate Month OR Quarter
			if (oGlobalData.selectedOption === "3") {
				aInputIds.push("_monthComboBoxId");
			} else if (oGlobalData.selectedOption === "4") {
				aInputIds.push("_quarterComboBoxId");
			}

			var bAllValid = true;
			var aEmptyFields = [];

			aInputIds.forEach(function(sId) {
				var oInput = oView.byId(sId);
				if (oInput) {
					var sValue = oInput.getSelectedKey ? oInput.getSelectedKey().trim() : "";
					var sFieldName = mFieldNames[sId] || sId;

					if (!sValue) {
						bAllValid = false;
						aEmptyFields.push(sFieldName);
						oInput.setValueState("Error");
						oInput.setValueStateText("Please select " + sFieldName + ".");
					} else {
						oInput.setValueState("None");
					}
				}
			});

			if (aEmptyFields.length > 0) {
				sap.m.MessageBox.error(
					"Please select the following fields before proceeding:\n\n" + aEmptyFields.join("\n")
				);
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
			var oYearBox = this.byId("fiscalYearSelectionBox");
			var oMonthBox = this.byId("monthSelectionBox");
			var oQuarterBox = this.byId("quarterSelectionBox");

			if (oSelectedIndex === 0) { // Monthly selected
				oYearBox.setVisible(true);
				oMonthBox.setVisible(true);
				oQuarterBox.setVisible(false);

				// When Incoming/Outgoing Radio Button Selected
				oGlobalModel.setProperty("/selectedOption", "3");
				oGlobalModel.setProperty("/isChartFragment1Visible", true);
				oGlobalModel.setProperty("/isChartFragment2Visible", false);
				oGlobalModel.setProperty("/isChartFragment3Visible", false);

				// When Main GL Radio Button Selected
				oGlobalModel.setProperty("/isChartFragment4Visible", true);
				oGlobalModel.setProperty("/isChartFragment5Visible", false);
				oGlobalModel.setProperty("/isChartFragment6Visible", false);

			} else if (oSelectedIndex === 1) { // Quarterly selected
				oYearBox.setVisible(true);
				oMonthBox.setVisible(false);
				oQuarterBox.setVisible(true);

				// When Incoming/Outgoing Radio Button Selected
				oGlobalModel.setProperty("/selectedOption", "4");
				oGlobalModel.setProperty("/isChartFragment1Visible", false);
				oGlobalModel.setProperty("/isChartFragment2Visible", true);
				oGlobalModel.setProperty("/isChartFragment3Visible", false);

				// When Main GL Radio Button Selected
				oGlobalModel.setProperty("/isChartFragment4Visible", false);
				oGlobalModel.setProperty("/isChartFragment5Visible", true);
				oGlobalModel.setProperty("/isChartFragment6Visible", false);

			} else if (oSelectedIndex === 2) { // Yearly selected
				oYearBox.setVisible(true);
				oMonthBox.setVisible(false);
				oQuarterBox.setVisible(false);

				// When Incoming/Outgoing Radio Button Selected
				oGlobalModel.setProperty("/selectedOption", "6");
				oGlobalModel.setProperty("/isChartFragment1Visible", false);
				oGlobalModel.setProperty("/isChartFragment2Visible", false);
				oGlobalModel.setProperty("/isChartFragment3Visible", true);

				// When Main GL Radio Button Selected
				oGlobalModel.setProperty("/isChartFragment4Visible", false);
				oGlobalModel.setProperty("/isChartFragment5Visible", false);
				oGlobalModel.setProperty("/isChartFragment6Visible", true);

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

		_buildGLFilters: function() {
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
			if (["A", "B"].includes(selectedGLType) && ["3", "4", "6"].includes(selectedOption)) {
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

			if (!this.validateInputs()) {
				return; // Stop if required fields are missing
			}

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

					// 🔁 Single helper function for all transformation
					oData = this._prepareGLBalanceData(oData);

					// 🔁 Convert numeric fields into Lakhs
					oData = this._convertGLValuesToLakhs(oData);

					console.log("Modified GL Data (Lakhs):", oData);

					if (oGlobalData.selectedGLType === "A" && oGlobalData.selectedOption === "3") {
						// Incoming & Outgoing GL (Monthly)
						oGLlistModel.setProperty("/inOutGLDataMonthly", oData);
						this._bindIncomingOutgoingGLMonthlyChart("chartFragment1", oData);

					} else if (oGlobalData.selectedGLType === "A" && oGlobalData.selectedOption === "4") {
						// Incoming & Outgoing GL (Quarterly)
						oGLlistModel.setProperty("/inOutGLDataQuarterly", oData);
						this._bindIncomingOutgoingGLQuarterlyChart("chartFragment2", oData);

					} else if (oGlobalData.selectedGLType === "A" && oGlobalData.selectedOption === "6") {
						// Incoming & Outgoing GL (Yearly)
						oGLlistModel.setProperty("/inOutGLDataYearly", oData);
						this._bindIncomingOutgoingGLYearlyChart("chartFragment3", oData);

					} else if (oGlobalData.selectedGLType === "B" && oGlobalData.selectedOption === "3") {
						// Main GL (Monthly)
						oGLlistModel.setProperty("/mainGLDataMonthly", oData);
						this._bindMainGLMonthlyChart("chartFragment4", oData);

					} else if (oGlobalData.selectedGLType === "B" && oGlobalData.selectedOption === "4") {
						// Main GL (Quarterly)
						oGLlistModel.setProperty("/mainGLDataQuarterly", oData);
						this._bindMainGLQuarterlyChart("chartFragment5", oData);
					} else if (oGlobalData.selectedGLType === "B" && oGlobalData.selectedOption === "6") {
						// Main GL (Quarterly)
						oGLlistModel.setProperty("/mainGLDataYearly", oData);
						this._bindMainGLYearlyChart("chartFragment6", oData);
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

		// 🔹 Single helper for data transformation
		_prepareGLBalanceData: function(aData) {
			var monthNames = {
				// "01": "January",
				// "02": "February",
				// "03": "March",
				"01": "April",
				"02": "May",
				"03": "June",
				"04": "July",
				"05": "August",
				"06": "September",
				"07": "October",
				"08": "November",
				"09": "December",
				"10": "January",
				"11": "February",
				"12": "March"
			};

			return aData.map(item => {
				// Convert numeric period to month name (fallback to "Unknown")
				var monthName = monthNames[item.period] || "Unknown";

				return {
					...item,
					periodText: monthName
				};
			});
		},
		_convertGLValuesToLakhs: function(aData) {
			return aData.map(function(item) {
				var parseNum = (val) => {
					var num = parseFloat(val);
					return isNaN(num) ? 0 : num / 100000; // Convert to Lakhs
				};

				return Object.assign({}, item, {
					per_sales_i: parseNum(item.per_sales_i).toFixed(2),
					per_sales_o: parseNum(item.per_sales_o).toFixed(2),
					balance: parseNum(item.balance).toFixed(2)
				});
			});
		},

		/*************** Clear data from all input fields,radio button & model make it default  *****************/

		clearListData: function() {
			var that = this;
			var oView = that.getView();

			sap.m.MessageBox.confirm("Are you sure you want to clear all data?", {
				onClose: function(oAction) {
					var oGlobalDataModel = that.getOwnerComponent().getModel("globalData");

					if (oAction === sap.m.MessageBox.Action.OK) {

						// Reset GL Radio Group
						const oRadioGroupGL = that.byId("radioBtnGroupGL");
						if (oRadioGroupGL) {
							oRadioGroupGL.setSelectedIndex(0); // "Incoming & Outgoing GL"
						}

						// Reset Period Radio Group
						const oRadioGroupPeriod = that.byId("radioBtnGroupPeriod");
						if (oRadioGroupPeriod) {
							oRadioGroupPeriod.setSelectedIndex(0); // "Monthly"
						}

						var oIncomingOutgoingPanel = that.byId("panelIncomingOutgoingViewBox");
						var oMainGLPanel = that.byId("panelMainViewBox");

						oIncomingOutgoingPanel.setVisible(true);
						oMainGLPanel.setVisible(false);

						// Incoming & Outgoing GL TabBar
						const oIconTabBarInOut = oView.byId("iconTabIncomingOutgoingBar");
						if (oIconTabBarInOut) {
							oIconTabBarInOut.setSelectedKey("scenario1");
						}

						// Main GL TabBar
						const oIconTabBarMain = oView.byId("iconTabMainBar");
						if (oIconTabBarMain) {
							oIconTabBarMain.setSelectedKey("scenario4");
						}

						var oYearBox = that.byId("fiscalYearSelectionBox");
						var oMonthBox = that.byId("monthSelectionBox");
						var oQuarterBox = that.byId("quarterSelectionBox");

						oYearBox.setVisible(true);
						oMonthBox.setVisible(true);
						oQuarterBox.setVisible(false);

						oGlobalDataModel.setProperty("/selectedGLType", "A");
						oGlobalDataModel.setProperty("/selectedTabText", "Incoming & Outgoing GL(Monthly)");
						oGlobalDataModel.setProperty("/selectedOption", "3");

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
							// venderMasterData: ["/"],
							// companyCodeMasterData: ["/"],
							globalData: ["/"],
							venderHistoryData: ["/"],
							GLMasterData: ["/"]

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

						that._updateGlobalDataModel();
					}
				}
			});
		},

		/*************** chart function & plotting the chart Incoming & Outgoing GL data  *****************/

		// ==========================================================
		//  🔹 Incoming & Outgoing GL - Monthly
		// ==========================================================
		_bindIncomingOutgoingGLMonthlyChart: function(sFragmentId, oData) {
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idMonthlyAmountVizFrame");
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idPopOverMonthlyAmount");

			if (!oVizFrame || !oPopover) return console.warn("VizFrame or Popover missing:", sFragmentId);

			oPopover.connect(oVizFrame.getVizUid());

			oVizFrame.setVizProperties({
				title: {
					text: "Incoming & Outgoing GL (Monthly)",
					visible: true
				},
				plotArea: {
					dataLabel: {
						visible: true,
						formatString: "#,##0.00"
					},
					drawingEffect: "glossy",
					colorPalette: ["#00C6FF", "#E5C757"]
				},
				legend: {
					visible: true
				},
				valueAxis: {
					title: {
						text: "Amount (₹ Lacs)"
					}
				},
				categoryAxis: {
					title: {
						text: "Month"
					}
				},
				tooltip: {
					visible: true
				}
			});
		},

		// ==========================================================
		//  🔹 Incoming & Outgoing GL - Quarterly
		// ==========================================================
		_bindIncomingOutgoingGLQuarterlyChart: function(sFragmentId, oData) {
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idQuarterlyAmountVizFrame");
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idPopOverQuarterlyAmount");

			if (!oVizFrame || !oPopover) return console.warn("VizFrame or Popover missing:", sFragmentId);

			oPopover.connect(oVizFrame.getVizUid());

			oVizFrame.setVizProperties({
				title: {
					text: "Incoming & Outgoing GL (Quarterly)",
					visible: true
				},
				plotArea: {
					dataLabel: {
						visible: true,
						formatString: "#,##0.00"
					},
					drawingEffect: "glossy",
					colorPalette: ["#00C6FF", "#E5C757"]
				},
				legend: {
					visible: true
				},
				valueAxis: {
					title: {
						text: "Amount (₹ Lacs)"
					}
				},
				categoryAxis: {
					title: {
						text: "Quarter"
					}
				},
				tooltip: {
					visible: true
				}
			});
		},

		// ==========================================================
		//  🔹 Incoming & Outgoing GL - Yearly
		// ==========================================================
		_bindIncomingOutgoingGLYearlyChart: function(sFragmentId, oData) {
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idYearlyAmountVizFrame");
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idPopOverYearlyAmount");

			if (!oVizFrame || !oPopover) return console.warn("VizFrame or Popover missing:", sFragmentId);

			oPopover.connect(oVizFrame.getVizUid());

			oVizFrame.setVizProperties({
				title: {
					text: "Incoming & Outgoing GL (Yearly)",
					visible: true
				},
				plotArea: {
					dataLabel: {
						visible: true,
						formatString: "#,##0.00"
					},
					drawingEffect: "glossy",
					colorPalette: ["#00C6FF", "#E5C757"]
				},
				legend: {
					visible: true
				},
				valueAxis: {
					title: {
						text: "Amount (₹ Lacs)"
					}
				},
				categoryAxis: {
					title: {
						text: "Year"
					}
				},
				tooltip: {
					visible: true
				}
			});
		},

		// ==========================================================
		//  🔹 Main GL - Monthly
		// ==========================================================
		// 🔹 Helper function to generate random colors
		_getRandomColor: function() {
			// Generates bright, distinct colors using HSL
			var hue = Math.floor(Math.random() * 360);
			var saturation = 80 + Math.random() * 10; // 80–90%
			var lightness = 45 + Math.random() * 10; // 45–55%
			return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
		},
		_bindMainGLMonthlyChart: function(sFragmentId, oData) {
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idMainGLMonthlyVizFrame");
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idMainGLMonthlyPopover");

			if (!oVizFrame || !oPopover) return console.warn("VizFrame or Popover missing:", sFragmentId);

			oPopover.connect(oVizFrame.getVizUid());

			// 🔹 Step 1: Generate random color for each unique periodText (Month)
			var colorMap = {};
			oData.forEach(item => {
				var month = item.periodText || item.period; // fallback if periodText missing
				if (!colorMap[month]) {
					colorMap[month] = this._getRandomColor();
				}
			});

			// 🔹 Step 2: Define color rules for VizFrame
			var rules = Object.keys(colorMap).map(month => ({
				dataContext: {
					"Month": month
				}, // matches DimensionDefinition name
				properties: {
					color: colorMap[month]
				}
			}));

			oVizFrame.setVizProperties({
				title: {
					text: "Main GL (Monthly)",
					visible: true
				},
				plotArea: {
					dataLabel: {
						visible: true,
						formatString: "#,##0.00"
					},
					drawingEffect: "glossy",
					// colorPalette: ["#E67E22"]
					dataPointStyle: {
						rules: rules
					},
				},
				valueAxis: {
					title: {
						text: "Bank Balance (₹ Lacs)"
					}
				},
				categoryAxis: {
					title: {
						text: "Month"
					}
				},
				tooltip: {
					visible: true
				},
				legend: {
					visible: false
				}
			});
		},

		// ==========================================================
		//  🔹 Main GL - Quarterly
		// ==========================================================
		_bindMainGLQuarterlyChart: function(sFragmentId, oData) {
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idMainGLQuarterlyVizFrame");
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idMainGLQuarterlyPopover");

			if (!oVizFrame || !oPopover) return console.warn("VizFrame or Popover missing:", sFragmentId);

			oPopover.connect(oVizFrame.getVizUid());

			// Step 1: Create color map for each Quarter-Year combination
			var colorMap = {};
			var uniqueKeys = [];

			oData.forEach(function(item) {
				var key = item.quarter + " / " + item.gjahr; // unique combo per bar
				if (!uniqueKeys.includes(key)) {
					uniqueKeys.push(key);
				}
			});

			var that = this;
			uniqueKeys.forEach(function(key, i) {
				colorMap[key] = that._getRandomColor(); // use your defined random color generator
			});

			// Step 2: Create rules for data point style
			var rules = oData.map(function(item) {
				var key = item.quarter + " / " + item.gjahr;
				return {
					dataContext: {
						"Month": item.quarter, // matches dimension in fragment
						"Year": item.gjahr
					},
					properties: {
						color: colorMap[key]
					}
				};
			});

			oVizFrame.setVizProperties({
				title: {
					text: "Main GL (Quarterly)",
					visible: true
				},
				plotArea: {
					dataLabel: {
						visible: true,
						formatString: "#,##0.00"
					},
					drawingEffect: "glossy",
					// colorPalette: ["#E67E22"]

					dataPointStyle: {
						rules: rules
					},
				},
				valueAxis: {
					title: {
						text: "Bank Balance (₹ Lacs)"
					}
				},
				categoryAxis: {
					title: {
						text: "Quarter"
					}
				},
				tooltip: {
					visible: true
				},
				legend: {
					visible: false
				}
			});
		},
		// ==========================================================
		//  🔹 Main GL - Yearly
		// ==========================================================
		_bindMainGLYearlyChart: function(sFragmentId, oData) {
			var oVizFrame = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idMainGLYearlyVizFrame");
			var oPopover = sap.ui.core.Fragment.byId(this.createId(sFragmentId), "idMainGLYearlyPopover");

			if (!oVizFrame || !oPopover) return console.warn("VizFrame or Popover missing:", sFragmentId);

			oPopover.connect(oVizFrame.getVizUid());
			
			// 🔹 Step 1: Generate random color for each unique periodText (Month)
			var colorMap = {};
			oData.forEach(item => {
				var year = item.gjahr; // fallback if periodText missing
				if (!colorMap[year]) {
					colorMap[year] = this._getRandomColor();
				}
			});

			// 🔹 Step 2: Define color rules for VizFrame
			var rules = Object.keys(colorMap).map(year => ({
				dataContext: {
					"Year": year
				}, // matches DimensionDefinition name
				properties: {
					color: colorMap[year]
				}
			}));

			oVizFrame.setVizProperties({
				title: {
					text: "Main GL (Yearly)",
					visible: true
				},
				plotArea: {
					dataLabel: {
						visible: true,
						formatString: "#,##0.00"
					},
					drawingEffect: "glossy",
					// colorPalette: ["#E67E22"]
					dataPointStyle: {
						rules: rules
					}
				},
				valueAxis: {
					title: {
						text: "Bank Balance (₹ Lacs)"
					}
				},
				categoryAxis: {
					title: {
						text: "Year"
					}
				},
				tooltip: {
					visible: true
				},
				legend: {
					visible: false
				}
			});
		}

	});
});