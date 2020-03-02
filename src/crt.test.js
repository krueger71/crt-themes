let crt = require("./crt.js");

test("rgbaStrToArray", () => {
  expect(crt.rgbaStrToArray("#000")).toEqual([0, 0, 0, 1]);
  expect(crt.rgbaStrToArray("#fff")).toEqual([255, 255, 255, 1]);
  expect(crt.rgbaStrToArray("#0000")).toEqual([0, 0, 0, 0]);
  expect(crt.rgbaStrToArray("#ffff")).toEqual([255, 255, 255, 1]);
  expect(crt.rgbaStrToArray("#000000")).toEqual([0, 0, 0, 1]);
  expect(crt.rgbaStrToArray("#ffffff")).toEqual([255, 255, 255, 1]);
  expect(crt.rgbaStrToArray("#00000000")).toEqual([0, 0, 0, 0]);
  expect(crt.rgbaStrToArray("#ffffffff")).toEqual([255, 255, 255, 1]);
});

test("rgbaArrayToStr", () => {
  expect(crt.rgbaArrayToStr([255, 255, 255, 1])).toEqual("#ffffffff");
  expect(crt.rgbaArrayToStr([128, 128, 128, 0.5])).toEqual("#80808080");
});

test("opaque", () => {
  expect(crt.opaque([0, 129, 255, 0.4], [255, 255, 255])).toEqual([
    153,
    205,
    255,
    1
  ]);
});

test("opaqueRgb", () => {
  expect(
    crt.opaqueRgb(
      crt.rgbaArrayToStr([0, 129, 255, 0.4]),
      crt.rgbaArrayToStr([255, 255, 255, 1])
    )
  ).toEqual("#99cdffff");
  expect(crt.opaqueRgb("#ffffffff", "#000000")).toEqual("#ffffffff");
  expect(crt.opaqueRgb("#000000ff", "#ffffff")).toEqual("#000000ff");
});
