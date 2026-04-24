import * as assert from 'assert';
import * as crt from '../crt';

suite('CRT Helper functions', () => {
  test("rgbaStrToArray", () => {
    assert.deepStrictEqual(crt.rgbaStrToArray("#000"), [0, 0, 0, 1]);
    assert.deepStrictEqual(crt.rgbaStrToArray("#fff"), [255, 255, 255, 1]);
    assert.deepStrictEqual(crt.rgbaStrToArray("#0000"), [0, 0, 0, 0]);
    assert.deepStrictEqual(crt.rgbaStrToArray("#ffff"), [255, 255, 255, 1]);
    assert.deepStrictEqual(crt.rgbaStrToArray("#000000"), [0, 0, 0, 1]);
    assert.deepStrictEqual(crt.rgbaStrToArray("#ffffff"), [255, 255, 255, 1]);
    assert.deepStrictEqual(crt.rgbaStrToArray("#00000000"), [0, 0, 0, 0]);
    assert.deepStrictEqual(crt.rgbaStrToArray("#ffffffff"), [255, 255, 255, 1]);
  });

  test("rgbaArrayToStr", () => {
    assert.deepStrictEqual(crt.rgbaArrayToStr([255, 255, 255, 1]), "#ffffffff");
    assert.deepStrictEqual(crt.rgbaArrayToStr([128, 128, 128, 0.5]), "#80808080");
  });

  test("opaque", () => {
    assert.deepStrictEqual(crt.opaque([0, 129, 255, 0.4], [255, 255, 255]), [
      153,
      205,
      255,
      1
    ]);
  });

  test("opaqueRgb", () => {
    assert.deepStrictEqual(
      crt.opaqueRgb(
        crt.rgbaArrayToStr([0, 129, 255, 0.4]),
        crt.rgbaArrayToStr([255, 255, 255, 1])
      )
      , "#99cdffff");
    assert.deepStrictEqual(crt.opaqueRgb("#ffffffff", "#000000"), "#ffffffff");
    assert.deepStrictEqual(crt.opaqueRgb("#000000ff", "#ffffff"), "#000000ff");
  });
});
