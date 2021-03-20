const IntangibleNFT = artifacts.require("IntangibleNFT");
const MarketplaceSettings = artifacts.require("MarketplaceSettings");
// _iMarketSettings, _iERC721CreatorRoyalty
const IntangibleMarketAuctionV2 = artifacts.require("IntangibleMarketAuctionV2");
// _iERC721CreatorRoyalty
const IntangibleRoyaltyRegistry = artifacts.require("IntangibleRoyaltyRegistry");
// _iERC721Creators
const IntangibleTokenCreatorRegistry = artifacts.require(
  "IntangibleTokenCreatorRegistry"
);
const truffleAssert = require("truffle-assertions");

describe("IntangibleMarketAuctionV2 Contract", function () {
  let owner;
  let artist;
  let collector;
  let intangibleNftInstance;
  let marketplaceSettingsInstance;
  let intangibleTokenCreatorRegistryInstance;
  let intangibleRoyaltyRegisteryInstance;
  let intangibleMarketAuctionV2;

  before(async function () {
    [owner, artist, collector] = await web3.eth.getAccounts();
    intangibleNftInstance = await IntangibleNFT.new({ from: owner });
    marketplaceSettingsInstance = await MarketplaceSettings.new({
      from: owner,
    });
    intangibleTokenCreatorRegistryInstance = await IntangibleTokenCreatorRegistry.new(
      [intangibleNftInstance.address],
      { from: owner }
    );
    intangibleRoyaltyRegisteryInstance = await IntangibleRoyaltyRegistry.new(
      intangibleTokenCreatorRegistryInstance.address,
      { from: owner }
    );
    intangibleMarketAuctionV2 = await IntangibleMarketAuctionV2.new(
      marketplaceSettingsInstance.address,
      intangibleRoyaltyRegisteryInstance.address,
      { from: owner }
    );
    await intangibleNftInstance.addToWhitelist(artist, { from: owner });
    // For coldie auction - tokenId => 1
    await intangibleNftInstance.mintToken(
      artist,
      "http://intangible.test/token_1",
      {
        from: artist,
      }
    );
    // For scheduled auction - tokenId => 2
    await intangibleNftInstance.mintToken(
      artist,
      "http://intangible.test/token_2",
      {
        from: artist,
      }
    );
    // For scheduled auction - tokenId => 3
    await intangibleNftInstance.mintToken(
      artist,
      "http://intangible.test/token_3",
      {
        from: artist,
      }
    );
    await marketplaceSettingsInstance.grantMarketplaceAccess(
      intangibleMarketAuctionV2.address,
      {
        from: owner,
      }
    );
  });

  const convertToWei = (amount) => {
    return web3.utils.toWei(amount.toString(), "ether");
  };

  const convertFromWei = (amount) => {
    return web3.utils.fromWei(amount.toString(), "ether");
  };

  // @dev
  // callerAddress => address who calls function
  // amount => price for nft token
  const approveAllAndSetSalePrice = async (callerAddress, amount, tokenId) => {
    await intangibleNftInstance.setApprovalForAll(
      intangibleMarketAuctionV2.address,
      true,
      { from: callerAddress }
    );

    await intangibleMarketAuctionV2.setSalePrice(
      intangibleNftInstance.address,
      tokenId,
      convertToWei(amount),
      { from: callerAddress }
    );
  };

  describe("Testing functions", () => {
    it("Should set sale price for nft token", async function () {
      const price = 1;

      await approveAllAndSetSalePrice(artist, price, 1);

      const tokenPrice = await intangibleMarketAuctionV2.tokenPrice(
        intangibleNftInstance.address,
        price
      );

      assert.equal(convertFromWei(tokenPrice), 1);
    });

    it("Should buy token with collector address", async function () {
      const price = 1;

      await approveAllAndSetSalePrice(artist, price, 2);

      const tokenPriceFeeIncluded = await intangibleMarketAuctionV2.tokenPriceFeeIncluded(
        intangibleNftInstance.address,
        2
      );

      await intangibleMarketAuctionV2.safeBuy(
        intangibleNftInstance.address,
        2,
        convertToWei(1),
        { from: collector, value: tokenPriceFeeIncluded }
      );

      const tokenOwner = await intangibleNftInstance.ownerOf(2);

      assert.equal(tokenOwner, collector);
    });

    it("Should bid", async function () {
      const price = 1;
      const token3BidAmount = 2;

      await approveAllAndSetSalePrice(artist, price, 3);

      const calculatedMarketplaceFee = await marketplaceSettingsInstance.calculateMarketplaceFee(
        convertToWei(token3BidAmount)
      );

      await intangibleMarketAuctionV2.bid(
        convertToWei(token3BidAmount),
        intangibleNftInstance.address,
        3,
        {
          from: collector,
          value: convertToWei(
            token3BidAmount +
              parseFloat(convertFromWei(calculatedMarketplaceFee))
          ),
        }
      );
    });

    it("Should cancel bid", async function () {
      await intangibleMarketAuctionV2.cancelBid(
        intangibleNftInstance.address,
        3,
        { from: collector }
      );

      const bidDetails = await intangibleMarketAuctionV2.currentBidDetailsOfToken(
        intangibleNftInstance.address,
        3
      );

      assert.equal(bidDetails["1"], "0x0000000000000000000000000000000000000000");
    });
  });
});
