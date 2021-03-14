const IntangibleNFT = artifacts.require("IntangibleNFT");
const truffleAssert = require("truffle-assertions");

describe("IntangibleNFT Contract", function () {
  let owner;
  let artist;
  let collector;
  let intangibleNftInstance;

  before(async function () {
    [owner, artist, collector] = await web3.eth.getAccounts();
  });

  describe("Deployment", function () {
    it("Should deploy with the right account", async function () {
      intangibleNftInstance = await IntangibleNFT.new({ from: owner });
      assert.equal(await intangibleNftInstance.owner(), owner);
    });

    it("Should control user who is not in the whitelist", async function () {
      assert.equal(await intangibleNftInstance.isWhitelisted(artist), false);
    });

    it("Should add user to the whitelist", async function () {
      await intangibleNftInstance.addToWhitelist(artist, { from: owner });
      assert.equal(await intangibleNftInstance.isWhitelisted(artist), true);
    });

    it("Should remove user from the whitelist", async function () {
      await intangibleNftInstance.removeFromWhitelist(artist, { from: owner });
      assert.equal(await intangibleNftInstance.isWhitelisted(artist), false);
    });

    it("Should return error for non-whitelisted user while minting token", async function () {
      await truffleAssert.reverts(
        intangibleNftInstance.mintToken(artist, "http://intangible.test/", {
          from: artist,
        }),
        "User must be whitelisted."
      );
    });

    it("Should mint token", async function () {
      await intangibleNftInstance.addToWhitelist(artist, { from: owner });
      await intangibleNftInstance.mintToken(artist, "http://intangible.test/", {
        from: artist,
      });
      assert.equal(await intangibleNftInstance.tokenCreator(1), artist);
    });
  });
});
