'use strict';

const id = (n) => `[${ String(n) }] `;

describe(`- Desc. 1`, () => {
    test(id(1) + `Ex. 1`, () => {
        expect(1 + 1).toBe(2);
    });
    test(id(2) + `Ex. 2`, () => {
        expect(2 + 3).not.toBe(6);
    });
});
