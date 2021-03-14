const IntangibleNFT = artifacts.require("IntangibleNFT");
const MarketplaceSettings = artifacts.require("MarketplaceSettings");
// _iMarketSettings, _iERC721CreatorRoyalty
const SuperRareAuctionHouse = artifacts.require("SuperRareAuctionHouse");
// _iERC721CreatorRoyalty
const SuperRareRoyaltyRegistry = artifacts.require("SuperRareRoyaltyRegistry");
// _iERC721Creators
const SuperRareTokenCreatorRegistry = artifacts.require(
  "SuperRareTokenCreatorRegistry"
);
const truffleAssert = require("truffle-assertions");

describe("SuperRareAuctionHouse Contract", function () {
  let owner;
  let artist;
  let collector;
  let intangibleNftInstance;
  let marketplaceSettingsInstance;
  let superRareTokenCreatorRegistryInstance;
  let superRareRoyaltyRegisteryInstance;
  let superRareAuctionHouseInstance;
  let scheduledAuctionType;

  before(async function () {
    [owner, artist, collector] = await web3.eth.getAccounts();
    intangibleNftInstance = await IntangibleNFT.new({ from: owner });
    marketplaceSettingsInstance = await MarketplaceSettings.new({
      from: owner,
    });
    superRareTokenCreatorRegistryInstance = await SuperRareTokenCreatorRegistry.new(
      [intangibleNftInstance.address],
      { from: owner }
    );
    superRareRoyaltyRegisteryInstance = await SuperRareRoyaltyRegistry.new(
      superRareTokenCreatorRegistryInstance.address,
      { from: owner }
    );
    superRareAuctionHouseInstance = await SuperRareAuctionHouse.new(
      marketplaceSettingsInstance.address,
      superRareRoyaltyRegisteryInstance.address,
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
    scheduledAuctionType = await superRareAuctionHouseInstance.SCHEDULED_AUCTION();
  });

  const convertToWei = (amount) => {
    return web3.utils.toWei(amount.toString(), "ether");
  };

  const convertFromWei = (amount) => {
    return web3.utils.fromWei(amount.toString(), "ether");
  };

  const getAuctionDetails = async (address, tokenId) => {
    return await superRareAuctionHouseInstance.getAuctionDetails(
      address,
      tokenId
    );
  };

  const setApprovalAndCreateColdieAuction = async () => {
    await intangibleNftInstance.setApprovalForAll(
      superRareAuctionHouseInstance.address,
      true,
      { from: artist }
    );

    await superRareAuctionHouseInstance.createColdieAuction(
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

    await superRareAuctionHouseInstance.bid(
      address,
      tokenId,
      convertToWei(bidAmount),
      { from: collector, value: convertToWei(bidAmount + requiredCost) }
    );
  };

  describe("Testing functions", async function () {
    it("Should not create coldie auction due to non-approval contract", async function () {
      await truffleAssert.reverts(
        superRareAuctionHouseInstance.createColdieAuction(
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

      const auctionDetails = await superRareAuctionHouseInstance.getAuctionDetails(
        intangibleNftInstance.address,
        1
      );

      // console.log(web3.utils.fromWei(auctionDetail['6'], "ether"));
      assert.equal(auctionDetails["2"], artist);
    });

    it("Should cancel auction", async function () {
      await superRareAuctionHouseInstance.cancelAuction(
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

      const currentBid = await superRareAuctionHouseInstance.getCurrentBid(
        intangibleNftInstance.address,
        1
      );

      assert.equal(currentBid["0"], collector);
      assert.equal(parseFloat(convertFromWei(currentBid["1"])), bidAmount);
    });

    it("Should settle auction", async function () {
      await marketplaceSettingsInstance.grantMarketplaceAccess(
        superRareAuctionHouseInstance.address,
        {
          from: owner,
        }
      );

      await superRareAuctionHouseInstance.settleAuction(
        intangibleNftInstance.address,
        1,
        { from: artist }
      );

      const tokenOwner = await intangibleNftInstance.ownerOf(1);

      assert.equal(tokenOwner, collector);
    });

    it("Should create scheduled auction", async function () {
      const blockNumber = await web3.eth.getBlockNumber();

      await superRareAuctionHouseInstance.createScheduledAuction(
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
