const IntangibleNFT = artifacts.require("IntangibleNFT");
const MarketplaceSettings = artifacts.require("MarketplaceSettings");
// _iMarketSettings, _iERC721CreatorRoyalty
const SuperRareAuctionHouse = artifacts.require("SuperRareAuctionHouse");
// _iMarketSettings, _iERC721CreatorRoyalty
const SuperRareMarketAuctionV2 = artifacts.require("SuperRareMarketAuctionV2");
// _iERC721CreatorRoyalty
const SuperRareRoyaltyRegistry = artifacts.require("SuperRareRoyaltyRegistry");
// _iERC721Creators
const SuperRareTokenCreatorRegistry = artifacts.require(
  "SuperRareTokenCreatorRegistry"
);

module.exports = function (deployer) {
  deployer
    .deploy(IntangibleNFT)
    .then(() => {
      return deployer.deploy(MarketplaceSettings);
    })
    .then(() => {
      return deployer.deploy(SuperRareTokenCreatorRegistry, [
        IntangibleNFT.address,
      ]);
    })
    .then(() => {
      return deployer.deploy(
        SuperRareRoyaltyRegistry,
        SuperRareTokenCreatorRegistry.address
      );
    })
    .then(() => {
      return deployer.deploy(
        SuperRareAuctionHouse,
        MarketplaceSettings.address,
        SuperRareRoyaltyRegistry.address
      );
    })
    .then(() => {
      deployer.deploy(
        SuperRareMarketAuctionV2,
        MarketplaceSettings.address,
        SuperRareRoyaltyRegistry.address
      );
    });
};
