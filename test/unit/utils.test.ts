import {expect} from "chai";
import {verify} from "../../index.js";
import {arrayOfIndexes, chunkifyMaximizeChunkSize, getTestSet} from "../utils";

describe("utils", () => {
  describe("helpers", () => {
    it("should build valid test sets", () => {
      const set = getTestSet();
      expect(verify(set.msg, set.pk, set.sig)).to.be.true;
    });
  });
  describe("chunkifyMaximizeChunkSize", () => {
    const minPerChunk = 3;
    const testCases = [
      [[0]],
      [[0, 1]],
      [[0, 1, 2]],
      [[0, 1, 2, 3]],
      [[0, 1, 2, 3, 4]],
      [
        [0, 1, 2],
        [3, 4, 5],
      ],
      [
        [0, 1, 2, 3],
        [4, 5, 6],
      ],
      [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
      ],
    ];

    for (const [i, testCase] of testCases.entries()) {
      it(`array len ${i + 1}`, () => {
        const arr = arrayOfIndexes(0, i);
        const chunks = chunkifyMaximizeChunkSize(arr, minPerChunk);
        expect(chunks).to.deep.equal(testCase);
      });
    }
  });
});
