const IntangibleNFT = artifacts.require("IntangibleNFT");
const MarketplaceSettings = artifacts.require("MarketplaceSettings");
// _iMarketSettings, _iERC721CreatorRoyalty
const IntangibleAuctionHouse = artifacts.require("IntangibleAuctionHouse");
// _iMarketSettings, _iERC721CreatorRoyalty
const IntangibleMarketAuctionV2 = artifacts.require(
  "IntangibleMarketAuctionV2"
);
// _iERC721CreatorRoyalty
const IntangibleRoyaltyRegistery = artifacts.require(
  "IntangibleRoyaltyRegistry"
);
// _iERC721Creators
const IntangibleTokenCreatorRegistry = artifacts.require(
  "IntangibleTokenCreatorRegistry"
);

module.exports = function (deployer) {
  deployer
    .deploy(IntangibleNFT)
    .then(() => {
      return deployer.deploy(MarketplaceSettings);
    })
    .then(() => {
      return deployer.deploy(IntangibleTokenCreatorRegistry, [
        IntangibleNFT.address,
      ]);
    })
    .then(() => {
      return deployer.deploy(
        IntangibleRoyaltyRegistery,
        IntangibleTokenCreatorRegistry.address
      );
    })
    .then(() => {
      return deployer.deploy(
        IntangibleAuctionHouse,
        MarketplaceSettings.address,
        IntangibleRoyaltyRegistery.address
      );
    })
    .then(() => {
      deployer.deploy(
        IntangibleMarketAuctionV2,
        MarketplaceSettings.address,
        IntangibleRoyaltyRegistery.address
      );
    });
};
