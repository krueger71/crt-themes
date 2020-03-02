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
const rgbaStrToArray = rgba => {
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
const rgbaArrayToStr = rgba => {
  return (
    "#" +
    rgba
      .map(function(x, i) {
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

const crtThemplate = (name, type, fg, bg, opacities) => {
  // Default levels of opacity
  const ol = [];
  for (let i = 0; i < 16; i++) {
    let y = "0";
    y += Math.round(0xff - i*0xff/15).toString(16);
    ol[i] = y.slice(-2);
  }
 
  // Override levels of opacity
  if (opacities) {
    for (let i = 0; i < opacities.length; i++) {
      ol[i+1] = opacities[i];
    }
  }

  const fgc = {};

  for (let i = 0; i < ol.length; i++) {
    fgc["t"+i] = fg + ol[i];
    fgc["s"+i] = opaqueRgb(fgc["t"+i], bg);
  }

  return {
    name: name,
    type: type,
    colors: {
      "activityBar.activeBackground": fgc.t7,
      "activityBar.activeBorder": fgc.t7,
      "activityBar.activeFocusBorder": fgc.t7,
      "activityBar.background": bg,
      "activityBar.border": fgc.t7,
      "activityBar.dropBackground": fgc.t12,
      "activityBar.foreground": fg,
      "activityBar.inactiveForeground": fgc.t7,
      "activityBarBadge.background": fg,
      "activityBarBadge.foreground": bg,
      "badge.background": bg,
      "badge.foreground": fg,
      "breadcrumb.activeSelectionForeground": fg,
      "breadcrumb.background": bg,
      "breadcrumb.focusForeground": fg,
      "breadcrumb.foreground": fg,
      "breadcrumbPicker.background": bg,
      "button.background": bg,
      "button.foreground": fg,
      "button.hoverBackground": fgc.t7,
      "checkbox.background": bg,
      "checkbox.border": fgc.t7,
      "checkbox.foreground": fg,
      "debugExceptionWidget.background": bg,
      "debugExceptionWidget.border": fgc.t7,
      "debugIcon.breakpointCurrentStackframeForeground": fg,
      "debugIcon.breakpointDisabledForeground": fgc.t12,
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
      "debugToolBar.background": bg,
      "debugToolBar.border": fgc.t7,
      "descriptionForeground": fg,
      "diffEditor.border": fgc.t7,
      "diffEditor.insertedTextBackground": fgc.t12,
      "diffEditor.insertedTextBorder": fgc.t7,
      "diffEditor.removedTextBackground": fgc.t12,
      "diffEditor.removedTextBorder": fgc.t7,
      "dropdown.background": bg,
      "dropdown.border": fgc.t7,
      "dropdown.foreground": fg,
      "dropdown.listBackground": fgc.t12,
      "editor.background": bg,
      "editor.findMatchBackground": fgc.t7,
      "editor.findMatchBorder": fgc.t7,
      "editor.findMatchHighlightBackground": bg,
      "editor.findMatchHighlightBorder": fgc.t7,
      "editor.findRangeHighlightBackground": bg,
      "editor.findRangeHighlightBorder": fgc.t7,
      "editor.focusedStackFrameHighlightBackground": bg,
      "editor.foldBackground": bg,
      "editor.foreground": fg,
      "editor.hoverHighlightBackground": fgc.s12,
      "editor.inactiveSelectionBackground": bg,
      "editor.lineHighlightBackground": fgc.t14,
      "editor.lineHighlightBorder": fgc.t14,
      "editor.rangeHighlightBackground": bg,
      "editor.rangeHighlightBorder": fgc.t7,
      "editor.selectionBackground": fgc.t12,
      "editor.selectionForeground": fg,
      "editor.selectionHighlightBackground": bg,
      "editor.selectionHighlightBorder": fgc.t7,
      "editor.snippetFinalTabstopHighlightBackground": bg,
      "editor.snippetFinalTabstopHighlightBorder": fgc.t7,
      "editor.snippetTabstopHighlightBackground": bg,
      "editor.snippetTabstopHighlightBorder": fgc.t7,
      "editor.stackFrameHighlightBackground": bg,
      "editor.symbolHighlightBackground": fgc.t12,
      "editor.symbolHighlightBorder": fgc.t7,
      "editor.wordHighlightBackground": fgc.t12,
      "editor.wordHighlightBorder": fgc.t7,
      "editor.wordHighlightStrongBackground": fgc.t7,
      "editor.wordHighlightStrongBorder": fgc.t7,
      "editorBracketMatch.background": bg,
      "editorBracketMatch.border": fgc.t7,
      "editorCodeLens.foreground": fg,
      "editorCursor.background": bg,
      "editorCursor.foreground": fg,
      "editorError.border": fgc.t7,
      "editorError.foreground": fg,
      "editorGroup.border": fgc.t7,
      "editorGroup.dropBackground": bg,
      "editorGroup.emptyBackground": bg,
      "editorGroup.focusedEmptyBorder": fgc.t7,
      "editorGroupHeader.noTabsBackground": bg,
      "editorGroupHeader.tabsBackground": bg,
      "editorGroupHeader.tabsBorder": fgc.t7,
      "editorGutter.addedBackground": bg,
      "editorGutter.background": bg,
      "editorGutter.commentRangeForeground": fg,
      "editorGutter.deletedBackground": bg,
      "editorGutter.modifiedBackground": bg,
      "editorHint.border": fgc.t7,
      "editorHint.foreground": fg,
      "editorHoverWidget.background": fgc.s12,
      "editorHoverWidget.border": fgc.t7,
      "editorHoverWidget.foreground": fg,
      "editorHoverWidget.statusBarBackground": fgc.t12,
      "editorIndentGuide.activeBackground": fgc.t12,
      "editorIndentGuide.background": fgc.t14,
      "editorInfo.border": fgc.t7,
      "editorInfo.foreground": fg,
      "editorLightBulb.foreground": fgc.t7,
      "editorLightBulbAutoFix.foreground": fgc.t7,
      "editorLineNumber.activeForeground": fg,
      "editorLineNumber.foreground": fgc.t12,
      "editorLink.activeForeground": fg,
      "editorMarkerNavigation.background": fgc.t12,
      "editorMarkerNavigationError.background": fgc.t12,
      "editorMarkerNavigationInfo.background": fgc.t12,
      "editorMarkerNavigationWarning.background": fgc.t12,
      "editorOverviewRuler.addedForeground": fg,
      "editorOverviewRuler.border": fgc.t7,
      "editorOverviewRuler.bracketMatchForeground": fg,
      "editorOverviewRuler.commonContentForeground": fg,
      "editorOverviewRuler.currentContentForeground": fg,
      "editorOverviewRuler.deletedForeground": fg,
      "editorOverviewRuler.errorForeground": fg,
      "editorOverviewRuler.findMatchForeground": fg,
      "editorOverviewRuler.incomingContentForeground": fg,
      "editorOverviewRuler.infoForeground": fg,
      "editorOverviewRuler.modifiedForeground": fg,
      "editorOverviewRuler.rangeHighlightForeground": fg,
      "editorOverviewRuler.selectionHighlightForeground": fg,
      "editorOverviewRuler.warningForeground": fg,
      "editorOverviewRuler.wordHighlightForeground": fg,
      "editorOverviewRuler.wordHighlightStrongForeground": fg,
      "editorPane.background": fgc.t12,
      "editorRuler.foreground": fg,
      "editorSuggestWidget.background": bg,
      "editorSuggestWidget.border": fgc.t7,
      "editorSuggestWidget.foreground": fg,
      "editorSuggestWidget.highlightForeground": fg,
      "editorSuggestWidget.selectedBackground": fgc.t7,
      "editorUnnecessaryCode.border": fgc.t7,
      "editorUnnecessaryCode.opacity": fgc.t12,
      "editorWarning.border": fgc.t7,
      "editorWarning.foreground": fg,
      "editorWhitespace.foreground": fgc.t12,
      "editorWidget.background": bg,
      "editorWidget.border": fgc.t7,
      "editorWidget.foreground": fg,
      "editorWidget.resizeBorder": fgc.t7,
      "errorForeground": fg,
      "extensionBadge.remoteBackground": bg,
      "extensionBadge.remoteForeground": fg,
      "extensionButton.prominentBackground": bg,
      "extensionButton.prominentForeground": fg,
      "extensionButton.prominentHoverBackground": bg,
      "focusBorder": fgc.t7,
      "foreground": fg,
      "gitDecoration.addedResourceForeground": fg,
      "gitDecoration.conflictingResourceForeground": fg,
      "gitDecoration.deletedResourceForeground": fg,
      "gitDecoration.ignoredResourceForeground": fgc.t7,
      "gitDecoration.modifiedResourceForeground": fg,
      "gitDecoration.submoduleResourceForeground": fg,
      "gitDecoration.untrackedResourceForeground": fg,
      "icon.foreground": fg,
      "imagePreview.border": fgc.t7,
      "input.background": bg,
      "input.border": fgc.t7,
      "input.foreground": fg,
      "input.placeholderForeground": fg,
      "inputOption.activeBackground": bg,
      "inputOption.activeBorder": fgc.t7,
      "inputValidation.errorBackground": bg,
      "inputValidation.errorBorder": fgc.t7,
      "inputValidation.errorForeground": fg,
      "inputValidation.infoBackground": bg,
      "inputValidation.infoBorder": fgc.t7,
      "inputValidation.infoForeground": fg,
      "inputValidation.warningBackground": bg,
      "inputValidation.warningBorder": fgc.t7,
      "inputValidation.warningForeground": fg,
      "list.activeSelectionBackground": fg,
      "list.activeSelectionForeground": bg,
      "list.dropBackground": fgc.t7,
      "list.errorForeground": fg,
      "list.filterMatchBackground": bg,
      "list.filterMatchBorder": fgc.t7,
      "list.focusBackground": fgc.t7,
      "list.focusForeground": fg,
      "list.highlightForeground": fg,
      "list.hoverBackground": fgc.t7,
      "list.hoverForeground": fg,
      "list.inactiveFocusBackground": fgc.t12,
      "list.inactiveSelectionBackground": fgc.t12,
      "list.inactiveSelectionForeground": fg,
      "list.invalidItemForeground": fg,
      "list.warningForeground": fg,
      "listFilterWidget.background": bg,
      "listFilterWidget.noMatchesOutline": fgc.t7,
      "listFilterWidget.outline": fg,
      "menu.background": bg,
      "menu.border": fgc.t7,
      "menu.foreground": fg,
      "menu.selectionBackground": fgc.t7,
      "menu.selectionBorder": fgc.t7,
      "menu.selectionForeground": bg,
      "menu.separatorBackground": fgc.t7,
      "menubar.selectionBackground": fgc.t12,
      "menubar.selectionBorder": fgc.t7,
      "menubar.selectionForeground": fg,
      "merge.border": fgc.t7,
      "merge.commonContentBackground": bg,
      "merge.commonHeaderBackground": bg,
      "merge.currentContentBackground": bg,
      "merge.currentHeaderBackground": bg,
      "merge.incomingContentBackground": bg,
      "merge.incomingHeaderBackground": bg,
      "minimap.errorHighlight": fgc.t7,
      "minimap.findMatchHighlight": fgc.t7,
      "minimap.selectionHighlight": fgc.t7,
      "minimap.warningHighlight": fgc.t7,
      "minimapGutter.addedBackground": fgc.t12,
      "minimapGutter.deletedBackground": fgc.t12,
      "minimapGutter.modifiedBackground": fgc.t12,
      "notificationCenter.border": fgc.t7,
      "notificationCenterHeader.background": bg,
      "notificationCenterHeader.foreground": fg,
      "notificationLink.foreground": fg,
      "notifications.background": bg,
      "notifications.border": fgc.t7,
      "notifications.foreground": fg,
      "notificationsErrorIcon.foreground": fg,
      "notificationsInfoIcon.foreground": fg,
      "notificationsWarningIcon.foreground": fg,
      "notificationToast.border": fgc.t7,
      "panel.background": bg,
      "panel.border": fgc.t7,
      "panel.dropBackground": fgc.t12,
      "panelInput.border": fgc.t7,
      "panelTitle.activeBorder": fgc.t7,
      "panelTitle.activeForeground": fg,
      "panelTitle.inactiveForeground": fgc.t7,
      "peekView.border": fgc.t7,
      "peekViewEditor.background": bg,
      "peekViewEditor.matchHighlightBackground": bg,
      "peekViewEditor.matchHighlightBorder": fgc.t7,
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
      "pickerGroup.border": fgc.t7,
      "pickerGroup.foreground": fg,
      "problemsErrorIcon.foreground": fg,
      "problemsInfoIcon.foreground": fg,
      "problemsWarningIcon.foreground": fg,
      "progressBar.background": fgc.t7,
      "quickInput.background": bg,
      "quickInput.foreground": fg,
      "scrollbar.shadow": fgc.t12,
      "scrollbarSlider.activeBackground": fgc.t12,
      "scrollbarSlider.background": fgc.t12,
      "scrollbarSlider.hoverBackground": fgc.t12,
      "searchEditor.findMatchBackground": bg,
      "searchEditor.findMatchBorder": fgc.t7,
      "searchEditor.textInputBorder": fgc.t7,
      "selection.background": fgc.t7,
      "settings.checkboxBackground": bg,
      "settings.checkboxBorder": fgc.t7,
      "settings.checkboxForeground": fg,
      "settings.dropdownBackground": bg,
      "settings.dropdownBorder": fgc.t7,
      "settings.dropdownForeground": fg,
      "settings.dropdownListBorder": fgc.t7,
      "settings.headerForeground": fg,
      "settings.modifiedItemIndicator": fg,
      "settings.numberInputBackground": bg,
      "settings.numberInputBorder": fgc.t7,
      "settings.numberInputForeground": fg,
      "settings.textInputBackground": bg,
      "settings.textInputBorder": fgc.t7,
      "settings.textInputForeground": fg,
      "sideBar.background": bg,
      "sideBar.border": fgc.t7,
      "sideBar.dropBackground": fgc.t7,
      "sideBar.foreground": fg,
      "sideBarSectionHeader.background": fgc.t12,
      "sideBarSectionHeader.border": fgc.t7,
      "sideBarSectionHeader.foreground": fg,
      "sideBarTitle.foreground": fg,
      "statusBar.background": fgc.t12,
      "statusBar.border": fgc.t7,
      "statusBar.debuggingBackground": fg,
      "statusBar.debuggingBorder": fgc.t7,
      "statusBar.debuggingForeground": bg,
      "statusBar.foreground": fg,
      "statusBar.noFolderBackground": bg,
      "statusBar.noFolderBorder": fgc.t7,
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
      "tab.activeBackground": fgc.t12,
      "tab.activeBorder": bg,
      "tab.activeBorderTop": bg,
      "tab.activeForeground": fg,
      "tab.activeModifiedBorder": fgc.t7,
      "tab.border": bg,
      "tab.hoverBackground": fgc.t12,
      "tab.hoverBorder": bg,
      "tab.inactiveBackground": bg,
      "tab.inactiveForeground": fgc.t7,
      "tab.inactiveModifiedBorder": bg,
      "tab.unfocusedActiveBackground": fgc.t12,
      "tab.unfocusedActiveBorder": bg,
      "tab.unfocusedActiveBorderTop": bg,
      "tab.unfocusedActiveForeground": fg,
      "tab.unfocusedActiveModifiedBorder": bg,
      "tab.unfocusedHoverBackground": fgc.t12,
      "tab.unfocusedHoverBorder": bg,
      "tab.unfocusedInactiveForeground": fgc.t7,
      "tab.unfocusedInactiveModifiedBorder": bg,
      "terminal.ansiBlack": fgc.s8,
      "terminal.ansiBlue": fgc.s9,
      "terminal.ansiBrightBlack": fgc.s0,
      "terminal.ansiBrightBlue": fgc.s1,
      "terminal.ansiBrightCyan": fgc.s2,
      "terminal.ansiBrightGreen": fgc.s3,
      "terminal.ansiBrightMagenta": fgc.s4,
      "terminal.ansiBrightRed": fgc.s5,
      "terminal.ansiBrightWhite": fgc.s6,
      "terminal.ansiBrightYellow": fgc.s7,
      "terminal.ansiCyan": fgc.s10,
      "terminal.ansiGreen": fgc.s11,
      "terminal.ansiMagenta": fgc.s12,
      "terminal.ansiRed": fgc.s13,
      "terminal.ansiWhite": fgc.s14,
      "terminal.ansiYellow": fgc.s14,
      "terminal.background": bg,
      "terminal.border": fgc.t7,
      "terminal.foreground": fg,
      "terminal.selectionBackground": fgc.t12,
      "terminalCursor.background": bg,
      "terminalCursor.foreground": fg,
      "textBlockQuote.background": bg,
      "textBlockQuote.border": fgc.t7,
      "textCodeBlock.background": bg,
      "textLink.activeForeground": fg,
      "textLink.foreground": fgc.t7,
      "textPreformat.foreground": fg,
      "textSeparator.foreground": fg,
      "titleBar.activeBackground": bg,
      "titleBar.activeForeground": fg,
      "titleBar.border": fgc.t7,
      "titleBar.inactiveBackground": bg,
      "titleBar.inactiveForeground": fg,
      "tree.indentGuidesStroke": fg,
      "walkThrough.embeddedEditorBackground": bg,
      "welcomePage.background": bg,
      "welcomePage.buttonBackground": bg,
      "welcomePage.buttonHoverBackground": bg,
      "widget.shadow": fg,
      "window.activeBorder": fgc.t7,
      "window.inactiveBorder": fgc.t7
    },
    tokenColors: [
      {
        scope: ["comment"],
        settings: {
          foreground: fgc.t12
        }
      },
      {
        scope: ["keyword", "storage"],
        settings: {
          foreground: fgc.t7
        }
      },
      {
        scope: ["entity", "strong"],
        settings: {
          fontStyle: "bold"
        }
      },
      {
        scope: ["invalid"],
        settings: {
          foreground: fgc.t7,
          fontStyle: "italic underline"
        }
      }
    ]
  };
};

module.exports = {
  opaque,
  opaqueRgb,
  rgbaArrayToStr,
  rgbaStrToArray,
  crtThemplate
};
