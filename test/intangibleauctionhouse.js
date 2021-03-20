const IntangibleNFT = artifacts.require("IntangibleNFT");
const MarketplaceSettings = artifacts.require("MarketplaceSettings");
// _iMarketSettings, _iERC721CreatorRoyalty
const IntangibleAuctionHouse = artifacts.require("IntangibleAuctionHouse");
// _iERC721CreatorRoyalty
const IntangibleRoyaltyRegistry = artifacts.require("IntangibleRoyaltyRegistry");
// _iERC721Creators
const IntangibleTokenCreatorRegistry = artifacts.require(
  "IntangibleTokenCreatorRegistry"
);
const truffleAssert = require("truffle-assertions");

describe("IntangibleAuctionHouse Contract", function () {
  let owner;
  let artist;
  let collector;
  let intangibleNftInstance;
  let marketplaceSettingsInstance;
  let intangibleTokenCreatorRegistryInstance;
  let intangibleRoyaltyRegistryInstance;
  let intangibleAuctionHouseInstance;
  let scheduledAuctionType;

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
    intangibleRoyaltyRegistryInstance = await IntangibleRoyaltyRegistry.new(
      intangibleTokenCreatorRegistryInstance.address,
      { from: owner }
    );
    intangibleAuctionHouseInstance = await IntangibleAuctionHouse.new(
      marketplaceSettingsInstance.address,
      intangibleRoyaltyRegistryInstance.address,
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
    scheduledAuctionType = await intangibleAuctionHouseInstance.SCHEDULED_AUCTION();
  });

  const convertToWei = (amount) => {
    return web3.utils.toWei(amount.toString(), "ether");
  };

  const convertFromWei = (amount) => {
    return web3.utils.fromWei(amount.toString(), "ether");
  };

  const getAuctionDetails = async (address, tokenId) => {
    return await intangibleAuctionHouseInstance.getAuctionDetails(
      address,
      tokenId
    );
  };

  const setApprovalAndCreateColdieAuction = async () => {
    await intangibleNftInstance.setApprovalForAll(
      intangibleAuctionHouseInstance.address,
      true,
      { from: artist }
    );

    await intangibleAuctionHouseInstance.createColdieAuction(
      intangibleNftInstance.address,
      1,
      convertToWei(1),
      1,
      { from: artist }
    );
  };

  const bid = async (address, tokenId, bidAmount) => {
    let reservePrice = await getAuctionDetails(address, tokenId);
    reservePrice = convertFromWei(reservePrice["6"]);
    let requiredCost = await marketplaceSettingsInstance.calculateMarketplaceFee(
      convertToWei(bidAmount)
    );
    requiredCost = convertFromWei(requiredCost);
    requiredCost = parseFloat(requiredCost);

    await intangibleAuctionHouseInstance.bid(
      address,
      tokenId,
      convertToWei(bidAmount),
      { from: collector, value: convertToWei(bidAmount + requiredCost) }
    );
  };

  describe("Testing functions", async function () {
    it("Should not create coldie auction due to non-approval contract", async function () {
      await truffleAssert.reverts(
        intangibleAuctionHouseInstance.createColdieAuction(
          intangibleNftInstance.address,
          1,
          convertToWei(1),
          1,
          { from: artist }
        ),
        "owner must have approved contract"
      );
    });

    it("Should create coldie auction", async function () {
      await setApprovalAndCreateColdieAuction();

      const auctionDetails = await intangibleAuctionHouseInstance.getAuctionDetails(
        intangibleNftInstance.address,
        1
      );

      // console.log(web3.utils.fromWei(auctionDetail['6'], "ether"));
      assert.equal(auctionDetails["2"], artist);
    });

    it("Should cancel auction", async function () {
      await intangibleAuctionHouseInstance.cancelAuction(
        intangibleNftInstance.address,
        1,
        { from: artist }
      );

      const auctionDetails = await getAuctionDetails(
        intangibleNftInstance.address,
        1
      );

      assert.equal(convertFromWei(auctionDetails["0"]), 0);
    });

    it("Should bid on coldie auction by collector", async function () {
      await setApprovalAndCreateColdieAuction();

      const bidAmount = 1.5;

      await bid(intangibleNftInstance.address, 1, bidAmount);

      const currentBid = await intangibleAuctionHouseInstance.getCurrentBid(
        intangibleNftInstance.address,
        1
      );

      assert.equal(currentBid["0"], collector);
      assert.equal(parseFloat(convertFromWei(currentBid["1"])), bidAmount);
    });

    it("Should settle auction", async function () {
      await marketplaceSettingsInstance.grantMarketplaceAccess(
        intangibleAuctionHouseInstance.address,
        {
          from: owner,
        }
      );

      await intangibleAuctionHouseInstance.settleAuction(
        intangibleNftInstance.address,
        1,
        { from: artist }
      );

      const tokenOwner = await intangibleNftInstance.ownerOf(1);

      assert.equal(tokenOwner, collector);
    });

    it("Should create scheduled auction", async function () {
      const blockNumber = await web3.eth.getBlockNumber();

      await intangibleAuctionHouseInstance.createScheduledAuction(
        intangibleNftInstance.address,
        2,
        convertToWei(1),
        2,
        blockNumber + 2,
        { from: artist }
      );

      const auctionDetails = await getAuctionDetails(
        intangibleNftInstance.address,
        2
      );

      assert.equal(auctionDetails["0"], scheduledAuctionType);
    });
  });
});
