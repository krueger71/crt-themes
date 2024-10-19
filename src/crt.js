/**
 * Compute the opaque color from a foreground color with alpha channel against at solid color background.
 *
 * We need the ability to compute the same opaque foreground color as the transparent
 * version with a formula.
 *
 * https://graphicdesign.stackexchange.com/questions/113007/how-to-determine-the-equivalent-opaque-rgb-color-for-a-given-partially-transpare
 * https://stackoverflow.com/questions/15898740/how-to-convert-rgba-to-a-transparency-adjusted-hex
 *
 * @param {number[]} rgba
 * @param {number[]} brgb
 * @returns {number[]} the solid color
 */

const opaque = (rgba, brgb) => {
  // Color = Color * alpha + Background * (1 - alpha);
  let ret = new Array(4);
  let alpha = rgba[3];
  ret[3] = 1;

  for (i = 0; i < 3; i++) {
    ret[i] = Math.round(rgba[i] * alpha + brgb[i] * (1 - alpha));
  }

  return ret;
};

/**
 * Compute the opaque color from a foreground with alpha and solid background.
 *
 * @param {string} rgba (#rgba or #rrggbbaa)
 * @param {string} brgb (#rgb or #rrggbb)
 *
 * @returns {string} the solid color
 */

const opaqueRgb = (rgba, brgb) => {
  return rgbaArrayToStr(opaque(rgbaStrToArray(rgba), rgbaStrToArray(brgb)));
};

/**
 * Split a hex rgba-value (#rrggbbaa or #rgba).
 *
 * @param {string} rgba
 * @returns {number[]} rgba array
 */
const rgbaStrToArray = (rgba) => {
  let ret = new Array(4);

  const p1 = () => {
    ret[0] = parseInt(rgba[1] + rgba[1], 16);
    ret[1] = parseInt(rgba[2] + rgba[2], 16);
    ret[2] = parseInt(rgba[3] + rgba[3], 16);
  };

  const p2 = () => {
    ret[0] = parseInt(rgba[1] + rgba[2], 16);
    ret[1] = parseInt(rgba[3] + rgba[4], 16);
    ret[2] = parseInt(rgba[5] + rgba[6], 16);
  };

  if (rgba.length === 4) {
    // #rgb
    p1();
    ret[3] = 1;
  } else if (rgba.length === 5) {
    // #rgba
    p1();
    ret[3] = parseInt(rgba[4] + rgba[4], 16) / 0xff;
  } else if (rgba.length === 7) {
    // #rrggbb
    p2();
    ret[3] = 1;
  } else if (rgba.length === 9) {
    // #rrggbbaa
    p2();
    ret[3] = parseInt(rgba[7] + rgba[8], 16) / 0xff;
  }

  return ret;
};

/**
 * Join rgba-array.
 *
 * @param {number[]} rgba
 * @returns {string} rgba string
 */
const rgbaArrayToStr = (rgba) => {
  return (
    "#" +
    rgba
      .map(function (x, i) {
        let y = "0";
        if (i < 3) {
          y += x.toString(16);
        } else {
          y += Math.round(x * 0xff).toString(16);
        }
        return y.slice(-2);
      })
      .join("")
  );
};

/**
 * Create a CRT Theme programmatically. Serialize into json for inclusion
 * in theme extension.
 *
 * @param {string} name the name of the template
 * @param {string} type of template (dark, light, hc)
 * @param {string} fg foreground color (#rrggbb)
 * @param {string} bg background color (#rrggbb)
 * @param {string[]} opacities array of up to 16 opacities as hex strings "00" to "ff" to override defaults
 *
 * @returns {any} the resulting template
 */

const crtTemplate = (name, type, fg, bg, opacities) => {
  // Default levels of opacity
  const ol = [];
  for (let i = 0; i < 16; i++) {
    let y = "0";
    y += Math.round(0xff - (i * 0xff) / 15).toString(16);
    ol[i] = y.slice(-2);
  }

  // Override levels of opacity
  if (opacities) {
    for (let i = 0; i < opacities.length; i++) {
      ol[i] = opacities[i];
    }
  }

  const fgc = {};

  for (let i = 0; i < ol.length; i++) {
    fgc["t" + i] = fg + ol[i];
    fgc["s" + i] = opaqueRgb(fgc["t" + i], bg);
  }

  let fg_ta = fgc.t7, //fg_sa = fgc.s7,
    fg_tb = fgc.t12,
    fg_sb = fgc.s12,
    fg_tc = fgc.t14; // fg_sc = fgc.s14;

  return {
    //$schema: "vscode://schemas/color-theme",
    name: name,
    type: type,
    colors: {
      "activityBar.activeBackground": fg_ta,
      "activityBar.activeBorder": fg_ta,
      "activityBar.activeFocusBorder": fg_ta,
      "activityBar.background": bg,
      "activityBar.border": fg_ta,
      "activityBar.dropBorder": fg_ta,
      "activityBar.foreground": fg,
      "activityBar.inactiveForeground": fg_ta,
      "activityBarBadge.background": fg,
      "activityBarBadge.foreground": bg,
      "badge.background": bg,
      "badge.foreground": fg,
      "breadcrumb.activeSelectionForeground": fg,
      "breadcrumb.background": bg,
      "breadcrumb.focusForeground": fg,
      "breadcrumb.foreground": fg_ta,
      "breadcrumbPicker.background": bg,
      "button.background": bg,
      "button.foreground": fg,
      "button.hoverBackground": fg_ta,
      "checkbox.background": bg,
      "checkbox.border": fg_ta,
      "checkbox.foreground": fg,
      "contrastActiveBorder": "default",
      "contrastBorder": "default",
      "debugConsole.errorForeground": fg,
      "debugConsole.infoForeground": fg,
      "debugConsole.sourceForeground": fg,
      "debugConsole.warningForeground": fg,
      "debugConsoleInputIcon.foreground": fg,
      "debugExceptionWidget.background": bg,
      "debugExceptionWidget.border": fg_ta,
      "debugIcon.breakpointCurrentStackframeForeground": fg,
      "debugIcon.breakpointDisabledForeground": fg_tb,
      "debugIcon.breakpointForeground": fg,
      "debugIcon.breakpointStackframeForeground": fg,
      "debugIcon.breakpointUnverifiedForeground": fg,
      "debugIcon.continueForeground": fg,
      "debugIcon.disconnectForeground": fg,
      "debugIcon.pauseForeground": fg,
      "debugIcon.restartForeground": fg,
      "debugIcon.startForeground": fg,
      "debugIcon.stepBackForeground": fg,
      "debugIcon.stepIntoForeground": fg,
      "debugIcon.stepOutForeground": fg,
      "debugIcon.stepOverForeground": fg,
      "debugIcon.stopForeground": fg,
      "debugTokenExpression.boolean": fg,
      "debugTokenExpression.error": fg,
      "debugTokenExpression.name": fg,
      "debugTokenExpression.number": fg,
      "debugTokenExpression.string": fg,
      "debugTokenExpression.value": fg,
      "debugToolBar.background": bg,
      "debugToolBar.border": fg_ta,
      "debugView.exceptionLabelBackground": bg,
      "debugView.exceptionLabelForeground": fg,
      "debugView.stateLabelBackground": bg,
      "debugView.stateLabelForeground": fg,
      "debugView.valueChangedHighlight": fg_ta,
      "descriptionForeground": fg,
      "diffEditor.border": fg_ta,
      "diffEditor.diagonalFill": fg_tc,
      "diffEditor.insertedTextBackground": fg_tb,
      "diffEditor.insertedTextBorder": "default",
      "diffEditor.removedTextBackground": fg_tb,
      "diffEditor.removedTextBorder": "default",
      "dropdown.background": bg,
      "dropdown.border": fg_ta,
      "dropdown.foreground": fg,
      "dropdown.listBackground": bg,
      "editor.background": bg,
      "editor.findMatchBackground": fg_ta,
      "editor.findMatchBorder": fg_ta,
      "editor.findMatchHighlightBackground": bg,
      "editor.findMatchHighlightBorder": fg_ta,
      "editor.findRangeHighlightBackground": bg,
      "editor.findRangeHighlightBorder": fg_ta,
      "editor.focusedStackFrameHighlightBackground": bg,
      "editor.foldBackground": bg,
      "editor.foreground": fg,
      "editor.hoverHighlightBackground": fg_sb,
      "editor.inactiveSelectionBackground": bg,
      "editor.lineHighlightBackground": fg_tc,
      "editor.lineHighlightBorder": "default",
      "editor.rangeHighlightBackground": bg,
      "editor.rangeHighlightBorder": fg_ta,
      "editor.selectionBackground": fg_tb,
      "editor.selectionForeground": fg,
      "editor.selectionHighlightBackground": bg,
      "editor.selectionHighlightBorder": fg_ta,
      "editor.snippetFinalTabstopHighlightBackground": bg,
      "editor.snippetFinalTabstopHighlightBorder": fg_ta,
      "editor.snippetTabstopHighlightBackground": bg,
      "editor.snippetTabstopHighlightBorder": fg_ta,
      "editor.stackFrameHighlightBackground": bg,
      "editor.symbolHighlightBackground": fg_tb,
      "editor.symbolHighlightBorder": fg_ta,
      "editor.wordHighlightBackground": fg_tb,
      "editor.wordHighlightBorder": fg_ta,
      "editor.wordHighlightStrongBackground": fg_ta,
      "editor.wordHighlightStrongBorder": fg_ta,
      "editorBracketMatch.background": bg,
      "editorBracketMatch.border": fg_ta,
      "editorCodeLens.foreground": fg,
      "editorCursor.background": bg,
      "editorCursor.foreground": fg,
      "editorError.border": fg_ta,
      "editorError.foreground": fg,
      "editorGroup.border": fg_ta,
      "editorGroup.dropBackground": fg_tb,
      "editorGroup.emptyBackground": bg,
      "editorGroup.focusedEmptyBorder": fg_ta,
      "editorGroupHeader.border": fg_ta,
      "editorGroupHeader.noTabsBackground": bg,
      "editorGroupHeader.tabsBackground": bg,
      "editorGroupHeader.tabsBorder": fg_ta,
      "editorGutter.addedBackground": fg_tb,
      "editorGutter.background": bg,
      "editorGutter.commentRangeForeground": fg_tb,
      "editorGutter.deletedBackground": fg_tb,
      "editorGutter.foldingControlForeground": fg_ta,
      "editorGutter.modifiedBackground": fg_tb,
      "editorHint.border": fg_ta,
      "editorHint.foreground": fg,
      "editorHoverWidget.background": fg_sb,
      "editorHoverWidget.border": fg_ta,
      "editorHoverWidget.foreground": fg,
      "editorHoverWidget.statusBarBackground": fg_tb,
      "editorIndentGuide.activeBackground": fg_tb,
      "editorIndentGuide.background": fg_tc,
      "editorInfo.border": fg_ta,
      "editorInfo.foreground": fg,
      "editorLightBulb.foreground": fg_ta,
      "editorLightBulbAutoFix.foreground": fg_ta,
      "editorLineNumber.activeForeground": fg,
      "editorLineNumber.foreground": fg_tb,
      "editorLink.activeForeground": fg,
      "editorMarkerNavigation.background": fg_tb,
      "editorMarkerNavigationError.background": fg_tb,
      "editorMarkerNavigationInfo.background": fg_tb,
      "editorMarkerNavigationWarning.background": fg_tb,
      "editorOverviewRuler.addedForeground": fg_tb,
      "editorOverviewRuler.background": bg,
      "editorOverviewRuler.border": fg_ta,
      "editorOverviewRuler.bracketMatchForeground": fg_tb,
      "editorOverviewRuler.commonContentForeground": fg_tb,
      "editorOverviewRuler.currentContentForeground": fg_tb,
      "editorOverviewRuler.deletedForeground": fg_tb,
      "editorOverviewRuler.errorForeground": fg_ta,
      "editorOverviewRuler.findMatchForeground": fg_tb,
      "editorOverviewRuler.incomingContentForeground": fg_tb,
      "editorOverviewRuler.infoForeground": fg_tb,
      "editorOverviewRuler.modifiedForeground": fg_tb,
      "editorOverviewRuler.rangeHighlightForeground": fg_tb,
      "editorOverviewRuler.selectionHighlightForeground": fg_tb,
      "editorOverviewRuler.warningForeground": fg_tb,
      "editorOverviewRuler.wordHighlightForeground": fg_tb,
      "editorOverviewRuler.wordHighlightStrongForeground": fg_tb,
      "editorPane.background": fg_tb,
      "editorRuler.foreground": fg,
      "editorSuggestWidget.background": bg,
      "editorSuggestWidget.border": fg_ta,
      "editorSuggestWidget.foreground": fg,
      "editorSuggestWidget.highlightForeground": fg,
      "editorSuggestWidget.selectedBackground": fg_ta,
      "editorUnnecessaryCode.border": fg_ta,
      "editorUnnecessaryCode.opacity": fg_tb,
      "editorWarning.border": fg_ta,
      "editorWarning.foreground": fg,
      "editorWhitespace.foreground": fg_tb,
      "editorWidget.background": bg,
      "editorWidget.border": fg_ta,
      "editorWidget.foreground": fg,
      "editorWidget.resizeBorder": fg_ta,
      "errorForeground": fg,
      "extensionBadge.remoteBackground": bg,
      "extensionBadge.remoteForeground": fg,
      "extensionButton.prominentBackground": bg,
      "extensionButton.prominentForeground": fg,
      "extensionButton.prominentHoverBackground": bg,
      "focusBorder": fg_ta,
      "foreground": fg,
      "gitDecoration.addedResourceForeground": fg,
      "gitDecoration.conflictingResourceForeground": fg,
      "gitDecoration.deletedResourceForeground": fg,
      "gitDecoration.ignoredResourceForeground": fg_ta,
      "gitDecoration.modifiedResourceForeground": fg,
      "gitDecoration.submoduleResourceForeground": fg,
      "gitDecoration.untrackedResourceForeground": fg,
      "icon.foreground": fg,
      "imagePreview.border": fg_ta,
      "input.background": bg,
      "input.border": fg_ta,
      "input.foreground": fg,
      "input.placeholderForeground": fg_ta,
      "inputOption.activeBackground": fg_tb,
      "inputOption.activeBorder": fg_ta,
      "inputOption.activeForeground": fg_ta,
      "inputValidation.errorBackground": bg,
      "inputValidation.errorBorder": fg_ta,
      "inputValidation.errorForeground": fg,
      "inputValidation.infoBackground": bg,
      "inputValidation.infoBorder": fg_ta,
      "inputValidation.infoForeground": fg,
      "inputValidation.warningBackground": bg,
      "inputValidation.warningBorder": fg_ta,
      "inputValidation.warningForeground": fg,
      "list.activeSelectionBackground": fg,
      "list.activeSelectionForeground": bg,
      "list.deemphasizedForeground": fg_ta,
      "list.dropBackground": fg_tb,
      "list.errorForeground": fg,
      "list.filterMatchBackground": bg,
      "list.filterMatchBorder": fg_ta,
      "list.focusBackground": fg_ta,
      "list.focusForeground": fg,
      "list.highlightForeground": fg,
      "list.hoverBackground": fg_ta,
      "list.hoverForeground": fg,
      "list.inactiveFocusBackground": fg_tb,
      "list.inactiveSelectionBackground": fg_tb,
      "list.inactiveSelectionForeground": fg,
      "list.invalidItemForeground": fg,
      "list.warningForeground": fg,
      "listFilterWidget.background": bg,
      "listFilterWidget.noMatchesOutline": fg_ta,
      "listFilterWidget.outline": fg,
      "menu.background": bg,
      "menu.border": fg_ta,
      "menu.foreground": fg,
      "menu.selectionBackground": fg_ta,
      "menu.selectionBorder": fg_ta,
      "menu.selectionForeground": bg,
      "menu.separatorBackground": fg_ta,
      "menubar.selectionBackground": fg_tb,
      "menubar.selectionBorder": fg_ta,
      "menubar.selectionForeground": fg,
      "merge.border": fg_ta,
      "merge.commonContentBackground": bg,
      "merge.commonHeaderBackground": bg,
      "merge.currentContentBackground": bg,
      "merge.currentHeaderBackground": bg,
      "merge.incomingContentBackground": bg,
      "merge.incomingHeaderBackground": bg,
      "minimap.background": bg,
      "minimap.errorHighlight": fg_ta,
      "minimap.findMatchHighlight": fg_ta,
      "minimap.selectionHighlight": fg_ta,
      "minimap.warningHighlight": fg_ta,
      "minimapGutter.addedBackground": fg_tb,
      "minimapGutter.deletedBackground": fg_tb,
      "minimapGutter.modifiedBackground": fg_tb,
      "minimapSlider.activeBackground": fg_tb,
      "minimapSlider.background": fg_tc,
      "minimapSlider.hoverBackground": fg_tc,
      "notebook.cellBorderColor": fg_ta,
      "notebook.cellStatusBarItemHoverBackground": fg_tc,
      "notebook.cellToolbarSeperator": fg_ta,
      "notebook.focusedCellIndicator": fg_tb,
      "notebook.outputContainerBackgroundColor": bg,
      "notebookStatusErrorIcon.foreground": "#ff0000",
      "notebookStatusRunningIcon.foreground": "#ff0000",
      "notebookStatusSuccessIcon.foreground": "#ff0000",
      "notificationCenter.border": fg_ta,
      "notificationCenterHeader.background": bg,
      "notificationCenterHeader.foreground": fg,
      "notificationLink.foreground": fg,
      "notifications.background": bg,
      "notifications.border": fg_ta,
      "notifications.foreground": fg,
      "notificationsErrorIcon.foreground": fg,
      "notificationsInfoIcon.foreground": fg,
      "notificationsWarningIcon.foreground": fg,
      "notificationToast.border": fg_ta,
      "panel.background": bg,
      "panel.border": fg_ta,
      "panel.dropBorder": fg,
      "panelInput.border": fg_ta,
      "panelSection.border": fg_ta,
      "panelSection.dropBackground": fg_tc,
      "panelSectionHeader.background": bg,
      "panelSectionHeader.border": fg_ta,
      "panelSectionHeader.foreground": fg,
      "panelTitle.activeBorder": fg_ta,
      "panelTitle.activeForeground": fg,
      "panelTitle.inactiveForeground": fg_ta,
      "peekView.border": fg_ta,
      "peekViewEditor.background": bg,
      "peekViewEditor.matchHighlightBackground": bg,
      "peekViewEditor.matchHighlightBorder": fg_ta,
      "peekViewEditorGutter.background": bg,
      "peekViewResult.background": bg,
      "peekViewResult.fileForeground": fg,
      "peekViewResult.lineForeground": fg,
      "peekViewResult.matchHighlightBackground": bg,
      "peekViewResult.selectionBackground": bg,
      "peekViewResult.selectionForeground": fg,
      "peekViewTitle.background": bg,
      "peekViewTitleDescription.foreground": fg,
      "peekViewTitleLabel.foreground": fg,
      "pickerGroup.border": fg_ta,
      "pickerGroup.foreground": fg,
      "problemsErrorIcon.foreground": fg,
      "problemsInfoIcon.foreground": fg,
      "problemsWarningIcon.foreground": fg,
      "progressBar.background": fg_ta,
      "quickInput.background": bg,
      "quickInput.foreground": fg,
      "quickInputTitle.background": bg,
      "scrollbar.shadow": fg_tb,
      "scrollbarSlider.activeBackground": fg_tb,
      "scrollbarSlider.background": fg_tb,
      "scrollbarSlider.hoverBackground": fg_tb,
      "searchEditor.findMatchBackground": bg,
      "searchEditor.findMatchBorder": fg_ta,
      "searchEditor.textInputBorder": fg_ta,
      "selection.background": fg_ta,
      "settings.checkboxBackground": bg,
      "settings.checkboxBorder": fg_ta,
      "settings.checkboxForeground": fg,
      "settings.dropdownBackground": bg,
      "settings.dropdownBorder": fg_ta,
      "settings.dropdownForeground": fg,
      "settings.dropdownListBorder": fg_ta,
      "settings.headerForeground": fg,
      "settings.modifiedItemIndicator": fg_ta,
      "settings.numberInputBackground": bg,
      "settings.numberInputBorder": fg_ta,
      "settings.numberInputForeground": fg,
      "settings.textInputBackground": bg,
      "settings.textInputBorder": fg_ta,
      "settings.textInputForeground": fg,
      "sideBar.background": bg,
      "sideBar.border": fg_ta,
      "sideBar.dropBackground": fg_tb,
      "sideBar.foreground": fg,
      "sideBarSectionHeader.background": fg_tb,
      "sideBarSectionHeader.border": fg_ta,
      "sideBarSectionHeader.foreground": fg,
      "sideBarTitle.foreground": fg,
      "statusBar.background": fg_tb,
      "statusBar.border": fg_ta,
      "statusBar.debuggingBackground": fg,
      "statusBar.debuggingBorder": fg_ta,
      "statusBar.debuggingForeground": bg,
      "statusBar.foreground": fg,
      "statusBar.noFolderBackground": bg,
      "statusBar.noFolderBorder": fg_ta,
      "statusBar.noFolderForeground": fg,
      "statusBarItem.activeBackground": bg,
      "statusBarItem.hoverBackground": bg,
      "statusBarItem.prominentBackground": bg,
      "statusBarItem.prominentForeground": fg,
      "statusBarItem.prominentHoverBackground": bg,
      "statusBarItem.remoteBackground": bg,
      "statusBarItem.remoteForeground": fg,
      "symbolIcon.arrayForeground": fg,
      "symbolIcon.booleanForeground": fg,
      "symbolIcon.classForeground": fg,
      "symbolIcon.colorForeground": fg,
      "symbolIcon.constantForeground": fg,
      "symbolIcon.constructorForeground": fg,
      "symbolIcon.enumeratorForeground": fg,
      "symbolIcon.enumeratorMemberForeground": fg,
      "symbolIcon.eventForeground": fg,
      "symbolIcon.fieldForeground": fg,
      "symbolIcon.fileForeground": fg,
      "symbolIcon.folderForeground": fg,
      "symbolIcon.functionForeground": fg,
      "symbolIcon.interfaceForeground": fg,
      "symbolIcon.keyForeground": fg,
      "symbolIcon.keywordForeground": fg,
      "symbolIcon.methodForeground": fg,
      "symbolIcon.moduleForeground": fg,
      "symbolIcon.namespaceForeground": fg,
      "symbolIcon.nullForeground": fg,
      "symbolIcon.numberForeground": fg,
      "symbolIcon.objectForeground": fg,
      "symbolIcon.operatorForeground": fg,
      "symbolIcon.packageForeground": fg,
      "symbolIcon.propertyForeground": fg,
      "symbolIcon.referenceForeground": fg,
      "symbolIcon.snippetForeground": fg,
      "symbolIcon.stringForeground": fg,
      "symbolIcon.structForeground": fg,
      "symbolIcon.textForeground": fg,
      "symbolIcon.typeParameterForeground": fg,
      "symbolIcon.unitForeground": fg,
      "symbolIcon.variableForeground": fg,
      "tab.activeBackground": fg_tb,
      "tab.activeBorder": bg,
      "tab.activeBorderTop": bg,
      "tab.activeForeground": fg,
      "tab.activeModifiedBorder": fg_ta,
      "tab.border": bg,
      "tab.hoverBackground": fg_tb,
      "tab.hoverBorder": fg_ta,
      "tab.hoverForeground": fg_ta,
      "tab.inactiveBackground": bg,
      "tab.inactiveForeground": fg_ta,
      "tab.inactiveModifiedBorder": bg,
      "tab.unfocusedActiveBackground": fg_tb,
      "tab.unfocusedActiveBorder": bg,
      "tab.unfocusedActiveBorderTop": bg,
      "tab.unfocusedActiveForeground": fg,
      "tab.unfocusedActiveModifiedBorder": bg,
      "tab.unfocusedHoverBackground": fg_tb,
      "tab.unfocusedHoverBorder": bg,
      "tab.unfocusedHoverForeground": fg_tb,
      "tab.unfocusedInactiveBackground": bg,
      "tab.unfocusedInactiveForeground": fg_ta,
      "tab.unfocusedInactiveModifiedBorder": bg,
      "terminal.ansiBlack": fgc.s0,
      "terminal.ansiBlue": fgc.s1,
      "terminal.ansiBrightBlack": fgc.s0,
      "terminal.ansiBrightBlue": fgc.s1,
      "terminal.ansiBrightCyan": fgc.s5,
      "terminal.ansiBrightGreen": fgc.s3,
      "terminal.ansiBrightMagenta": fgc.s2,
      "terminal.ansiBrightRed": fgc.s4,
      "terminal.ansiBrightWhite": fgc.s7,
      "terminal.ansiBrightYellow": fgc.s6,
      "terminal.ansiCyan": fgc.s5,
      "terminal.ansiGreen": fgc.s3,
      "terminal.ansiMagenta": fgc.s2,
      "terminal.ansiRed": fgc.s4,
      "terminal.ansiWhite": fgc.s7,
      "terminal.ansiYellow": fgc.s6,
      "terminal.background": bg,
      "terminal.border": fg_ta,
      "terminal.foreground": fg,
      "terminal.selectionBackground": fg_tb,
      "terminalCursor.background": bg,
      "terminalCursor.foreground": fg,
      "textBlockQuote.background": bg,
      "textBlockQuote.border": fg_ta,
      "textCodeBlock.background": bg,
      "textLink.activeForeground": fg,
      "textLink.foreground": fg_ta,
      "textPreformat.foreground": fg,
      "textSeparator.foreground": fg,
      "titleBar.activeBackground": bg,
      "titleBar.activeForeground": fg,
      "titleBar.border": fg_ta,
      "titleBar.inactiveBackground": bg,
      "titleBar.inactiveForeground": fg,
      "tree.indentGuidesStroke": fg_ta,
      "walkThrough.embeddedEditorBackground": bg,
      "welcomePage.background": bg,
      "welcomePage.buttonBackground": bg,
      "welcomePage.buttonHoverBackground": bg,
      "widget.shadow": fg_tb,
      "window.activeBorder": fg_ta,
      "window.inactiveBorder": fg_tb,
    },
    semanticHighlighting: false,
    tokenColors: [
      {
        scope: ["comment"],
        settings: {
          foreground: fg_ta,
        },
      },
      {
        scope: ["keyword", "storage"],
        settings: {
          foreground: fg_ta,
        },
      },
      {
        scope: ["entity", "strong"],
        settings: {
          fontStyle: "bold",
        },
      },
      {
        scope: ["invalid"],
        settings: {
          foreground: fg_ta,
          fontStyle: "italic underline",
        },
      },
    ],
  };
};

module.exports = {
  opaque,
  opaqueRgb,
  rgbaArrayToStr,
  rgbaStrToArray,
  crtTemplate,
};
