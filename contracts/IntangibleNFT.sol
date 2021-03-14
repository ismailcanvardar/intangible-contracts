// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IntangibleNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() public ERC721("IntangibleNFT", "INFT") {}

    mapping(address => bool) public whitelist;
    event AddedToWhitelist(address indexed account);
    event RemovedFromWhitelist(address indexed account);

    modifier onlyWhitelisted() {
        require(isWhitelisted(msg.sender), "User must be whitelisted.");
        _;
    }

    function addToWhitelist(address _address) public onlyOwner {
        whitelist[_address] = true;
        emit AddedToWhitelist(_address);
    }

    function removeFromWhitelist(address _address) public onlyOwner {
        whitelist[_address] = false;
        emit RemovedFromWhitelist(_address);
    }

    function isWhitelisted(address _creator) public view returns(bool) {
        return whitelist[_creator];
    }

    function tokenCreator(uint256 _tokenId)
        external
        view
        returns (address payable) {
            return payable(ownerOf(_tokenId));
        }

     function mintToken(address artist, string memory tokenURI)
        public
        onlyWhitelisted
        returns (uint256)
    {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(artist, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }
}