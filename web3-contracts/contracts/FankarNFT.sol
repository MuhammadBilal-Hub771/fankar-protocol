// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// ============================================================
//  Fankar Protocol — FankarNFT.sol
//  Network : WireFluid (Chain ID 92533)
//  Standard: ERC-721 URIStorage + ERC-2981 Royalty
//  OpenZeppelin: v5.x
// ============================================================

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  FankarNFT
 * @author Fankar Protocol Team
 * @notice Mints sports/creator culture assets on the WireFluid EVM network.
 *
 *  Key Features
 *  ─────────────
 *  1. AI-Gated Minting  — Every mint requires an ECDSA signature from the
 *     Fankar backend AI signer, preventing on-chain spam and bot minting.
 *
 *  2. 70 / 15 / 15 Royalty Split — On every paid mint (and secondary-sale
 *     royalty distribution):
 *       • 70 % → Creator  (the athlete / content creator)
 *       • 15 % → Brand    (the club / organiser / PSL franchise)
 *       • 15 % → Treasury (Fankar Protocol wallet)
 *
 *  3. Sport Metadata Mappings — On-chain storage for:
 *       • bowlingSpeed    : uint256  (km/h × 100 for 2-decimal precision)
 *       • uniquenessScore : uint256  (0–10 000  =  0.00 %–100.00 %)
 *
 *  4. ERC-2981 Royalty Standard — Marketplace-compatible royalty info.
 *
 *  5. Replay-Attack Protection — Per-sender nonce tracking ensures each
 *     AI signature can only be used once.
 */
contract FankarNFT is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {

    // ─────────────────────────────────────────────────────────
    //  LIBRARIES
    // ─────────────────────────────────────────────────────────

    using ECDSA for bytes32;

    // ─────────────────────────────────────────────────────────
    //  CONSTANTS  —  Royalty basis points (out of 10 000)
    // ─────────────────────────────────────────────────────────

    /// @dev 70 % of every payment goes to the content creator.
    uint16 public constant CREATOR_SHARE_BPS  = 7_000;

    /// @dev 15 % goes to the brand / club / organiser.
    uint16 public constant BRAND_SHARE_BPS    = 1_500;

    /// @dev 15 % goes to the Fankar Protocol treasury.
    uint16 public constant TREASURY_SHARE_BPS = 1_500;

    /// @dev Denominator for BPS calculations (must equal 10 000).
    uint16 public constant TOTAL_BPS          = 10_000;

    /// @dev Secondary-sale royalty charged by this contract via ERC-2981 (10 %).
    uint16 public constant SECONDARY_ROYALTY_BPS = 1_000;

    // ─────────────────────────────────────────────────────────
    //  STATE VARIABLES
    // ─────────────────────────────────────────────────────────

    /// @notice Address of the Fankar AI backend signer that authorises mints.
    address public aiSigner;

    /// @notice Fankar Protocol treasury — receives 15 % of every fee.
    address public treasury;

    /**
     * @dev Auto-incrementing token ID counter.
     *      Starts at 1 so that token ID 0 is never valid (useful for null checks).
     */
    uint256 private _nextTokenId;

    // ─────────────────────────────────────────────────────────
    //  METADATA MAPPINGS
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Bowling speed for cricket / sports NFTs.
     * @dev    Stored as km/h × 100 to preserve two decimal places without floats.
     *         Example: 14 550 → 145.50 km/h.
     *         Value of 0 means "not applicable" for non-sports assets.
     */
    mapping(uint256 tokenId => uint256 speedX100) public bowlingSpeed;

    /**
     * @notice Rarity / uniqueness score assigned by the AI engine.
     * @dev    Stored as an integer in the range 0–10 000, representing 0.00–100.00 %.
     *         Example: 9 750 → 97.50 % unique.
     */
    mapping(uint256 tokenId => uint256 scoreX100) public uniquenessScore;

    /// @notice Maps each token to the creator (athlete / content producer).
    mapping(uint256 tokenId => address creator) public tokenCreator;

    /// @notice Maps each token to the brand / organiser / PSL franchise.
    mapping(uint256 tokenId => address brand) public tokenBrand;

    /**
     * @notice Nonce registry — tracks which nonces have been consumed per sender.
     * @dev    Prevents a single AI signature from being used more than once.
     */
    mapping(address sender => mapping(uint256 nonce => bool used)) public usedNonces;

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a Fankar asset NFT is successfully minted.
     * @param tokenId        The newly minted token ID.
     * @param minter         Address that called mintFankarAsset.
     * @param creator        Creator address (receives 70 % of mint fee).
     * @param brand          Brand / organiser address (receives 15 %).
     * @param uri            IPFS / Arweave metadata URI.
     * @param bowlingSpd     Bowling speed (km/h × 100), 0 if N/A.
     * @param uniqueScore    Uniqueness score (0–10 000), 0 if N/A.
     */
    event AssetMinted(
        uint256 indexed tokenId,
        address indexed minter,
        address indexed creator,
        address          brand,
        string           uri,
        uint256          bowlingSpd,
        uint256          uniqueScore
    );

    /**
     * @notice Emitted every time royalties are split and distributed.
     * @param tokenId        Token whose royalties were distributed.
     * @param creator        Address that received the creator share.
     * @param brand          Address that received the brand share.
     * @param treasury       Address that received the treasury share.
     * @param creatorAmt     ETH amount sent to creator.
     * @param brandAmt       ETH amount sent to brand.
     * @param treasuryAmt    ETH amount sent to treasury.
     */
    event RoyaltyDistributed(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed brand,
        address          treasury,
        uint256          creatorAmt,
        uint256          brandAmt,
        uint256          treasuryAmt
    );

    /// @notice Emitted when the AI signer address is rotated.
    event AiSignerUpdated(address indexed oldSigner, address indexed newSigner);

    /// @notice Emitted when the treasury address is updated.
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ─────────────────────────────────────────────────────────
    //  CUSTOM ERRORS  (cheaper than require strings)
    // ─────────────────────────────────────────────────────────

    /// @dev Signature recovered address does not match `aiSigner`.
    error InvalidSignature();

    /// @dev The supplied nonce has already been used by this sender.
    error NonceAlreadyUsed(uint256 nonce);

    /// @dev A required address argument was the zero address.
    error ZeroAddress();

    /// @dev Low-level ETH transfer to `recipient` failed.
    error TransferFailed(address recipient, uint256 amount);

    /// @dev Uniqueness score exceeds the maximum of 10 000.
    error InvalidUniquenessScore(uint256 provided);

    /// @dev msg.value is less than the required mint fee.
    error InsufficientMintFee(uint256 sent, uint256 required);

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Deploys the FankarNFT contract.
     * @param _aiSigner   Address of the Fankar AI backend signing key.
     * @param _treasury   Fankar Protocol treasury wallet address.
     *
     * @dev  The deployer becomes the contract owner (via Ownable).
     *       Token IDs start at 1 (index 0 is reserved as a sentinel null value).
     */
    constructor(
        address _aiSigner,
        address _treasury
    )
        ERC721("Fankar Protocol", "FANKAR")
        Ownable(msg.sender)
    {
        if (_aiSigner  == address(0)) revert ZeroAddress();
        if (_treasury  == address(0)) revert ZeroAddress();

        aiSigner     = _aiSigner;
        treasury     = _treasury;
        _nextTokenId = 1; // Token IDs begin at 1
    }

    // ─────────────────────────────────────────────────────────
    //  CORE — AI-GATED MINT
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Mints a new Fankar Protocol NFT after verifying an AI-issued signature.
     *
     * @dev  Flow:
     *         1. Validate inputs (addresses, score bounds, fee, nonce uniqueness).
     *         2. Reconstruct the EIP-191 message hash from all mint parameters.
     *         3. Recover the signer from the provided ECDSA `signature`.
     *         4. Reject if signer ≠ `aiSigner`.
     *         5. Mark nonce used → mint token → store metadata.
     *         6. Distribute the mint fee (70 / 15 / 15).
     *         7. Refund any excess ETH to the caller.
     *
     * @param creator          Creator address — receives 70 % of `mintFee`.
     * @param brand            Brand / organiser address — receives 15 % of `mintFee`.
     * @param uri              Full IPFS or Arweave URI for the token metadata JSON.
     * @param mintFee          Exact ETH amount required for this mint (set by AI).
     *                         Pass 0 for free mints (still requires valid signature).
     * @param _bowlingSpeed    Bowling speed in km/h × 100.  Pass 0 if not applicable.
     * @param _uniquenessScore AI-assigned rarity score (0–10 000).  Pass 0 if N/A.
     * @param nonce            Unique per-sender nonce issued by the AI backend.
     * @param signature        ECDSA signature produced by `aiSigner` over the mint hash.
     *
     * @return tokenId         The ID of the newly minted token.
     */
    function mintFankarAsset(
        address        creator,
        address        brand,
        string calldata uri,
        uint256        mintFee,
        uint256        _bowlingSpeed,
        uint256        _uniquenessScore,
        uint256        nonce,
        bytes calldata signature
    )
        external
        payable
        nonReentrant
        returns (uint256 tokenId)
    {
        // ── 1. Input Validation ──────────────────────────────
        if (creator == address(0) || brand == address(0)) revert ZeroAddress();
        if (_uniquenessScore > 10_000) revert InvalidUniquenessScore(_uniquenessScore);
        if (msg.value < mintFee)       revert InsufficientMintFee(msg.value, mintFee);
        if (usedNonces[msg.sender][nonce]) revert NonceAlreadyUsed(nonce);

        // ── 2. Reconstruct & Verify AI Signature ─────────────
        bytes32 msgHash = _buildMintHash(
            msg.sender,
            creator,
            brand,
            uri,
            mintFee,
            _bowlingSpeed,
            _uniquenessScore,
            nonce
        );

        // Wrap with EIP-191 prefix ("\x19Ethereum Signed Message:\n32")
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(msgHash);

        // Recover signer address from the signature bytes
        address recovered = ECDSA.recover(ethHash, signature);
        if (recovered != aiSigner) revert InvalidSignature();

        // ── 3. Consume Nonce (replay protection) ─────────────
        usedNonces[msg.sender][nonce] = true;

        // ── 4. Mint ───────────────────────────────────────────
        tokenId = _nextTokenId++;          // Assign and advance counter
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        // ── 5. Store On-Chain Metadata ────────────────────────
        tokenCreator[tokenId]    = creator;
        tokenBrand[tokenId]      = brand;
        bowlingSpeed[tokenId]    = _bowlingSpeed;    // 0 = N/A
        uniquenessScore[tokenId] = _uniquenessScore; // 0 = N/A

        // Set 10 % ERC-2981 secondary-sale royalty, paid to this contract
        // so it can be re-distributed via distributeSecondaryRoyalties().
        _setTokenRoyalty(tokenId, address(this), SECONDARY_ROYALTY_BPS);

        // ── 6. Distribute Mint Fee (70 / 15 / 15) ────────────
        if (mintFee > 0) {
            _distributeRoyalties(tokenId, creator, brand, mintFee);
        }

        // ── 7. Refund Excess ETH ──────────────────────────────
        uint256 excess = msg.value - mintFee;
        if (excess > 0) {
            _sendETH(msg.sender, excess);
        }

        emit AssetMinted(tokenId, msg.sender, creator, brand, uri, _bowlingSpeed, _uniquenessScore);
    }

    // ─────────────────────────────────────────────────────────
    //  SECONDARY-SALE ROYALTY DISTRIBUTION
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Distributes secondary-sale royalties (received via ERC-2981) for a token.
     * @dev    Marketplaces send royalty ETH to this contract address.
     *         Anyone can call this to trigger the 70 / 15 / 15 split for a given token.
     *
     * @param tokenId   The token whose royalties are being distributed.
     * @param amount    Total ETH amount to distribute (must equal msg.value).
     */
    function distributeSecondaryRoyalties(uint256 tokenId, uint256 amount)
        external
        payable
        nonReentrant
    {
        require(msg.value == amount,               "Amount mismatch");
        require(_ownerOf(tokenId) != address(0),   "Token does not exist");

        address creator = tokenCreator[tokenId];
        address brand   = tokenBrand[tokenId];

        // Fallback: if creator/brand not stored, send everything to treasury
        if (creator == address(0)) creator = treasury;
        if (brand   == address(0)) brand   = treasury;

        _distributeRoyalties(tokenId, creator, brand, amount);
    }

    /// @notice Accept plain ETH transfers (from marketplace royalty payments).
    receive() external payable {}

    // ─────────────────────────────────────────────────────────
    //  VIEW HELPERS
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Returns all key metadata for a token in a single call.
     * @param tokenId  The token to query.
     * @return creator_        Creator address.
     * @return brand_          Brand / organiser address.
     * @return bowlingSpeed_   Bowling speed (km/h × 100).
     * @return uniqueness_     Uniqueness score (0–10 000).
     * @return uri_            Token metadata URI.
     */
    function getAssetData(uint256 tokenId)
        external
        view
        returns (
            address creator_,
            address brand_,
            uint256 bowlingSpeed_,
            uint256 uniqueness_,
            string memory uri_
        )
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        creator_      = tokenCreator[tokenId];
        brand_        = tokenBrand[tokenId];
        bowlingSpeed_ = bowlingSpeed[tokenId];
        uniqueness_   = uniquenessScore[tokenId];
        uri_          = tokenURI(tokenId);
    }

    /**
     * @notice Returns the next token ID that will be minted.
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Returns the total number of tokens minted so far.
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ─────────────────────────────────────────────────────────
    //  ADMIN FUNCTIONS  (onlyOwner)
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Rotates the AI signer address (e.g. for key rotation / security).
     * @dev    Emits AiSignerUpdated.  Only callable by the contract owner.
     * @param newSigner  New AI backend signing address.
     */
    function setAiSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit AiSignerUpdated(aiSigner, newSigner);
        aiSigner = newSigner;
    }

    /**
     * @notice Updates the protocol treasury address.
     * @dev    Emits TreasuryUpdated.  Only callable by the contract owner.
     * @param newTreasury  New treasury wallet.
     */
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /**
     * @notice Emergency ETH withdrawal — only if ETH is stuck in this contract.
     * @dev    Use with caution.  All pending royalties should be distributed first.
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");
        _sendETH(owner(), balance);
    }

    // ─────────────────────────────────────────────────────────
    //  INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────

    /**
     * @dev Splits `totalAmount` ETH into 70 / 15 / 15 and sends each share.
     *      Treasury share is computed as the remainder to avoid dust due to
     *      integer division rounding.
     */
    function _distributeRoyalties(
        uint256 tokenId,
        address creator,
        address brand,
        uint256 totalAmount
    ) internal {
        uint256 creatorAmt  = (totalAmount * CREATOR_SHARE_BPS)  / TOTAL_BPS; // 70 %
        uint256 brandAmt    = (totalAmount * BRAND_SHARE_BPS)    / TOTAL_BPS; // 15 %
        uint256 treasuryAmt = totalAmount - creatorAmt - brandAmt;            // 15 % + dust

        _sendETH(creator,  creatorAmt);
        _sendETH(brand,    brandAmt);
        _sendETH(treasury, treasuryAmt);

        emit RoyaltyDistributed(
            tokenId,
            creator,
            brand,
            treasury,
            creatorAmt,
            brandAmt,
            treasuryAmt
        );
    }

    /**
     * @dev Low-level ETH send using `.call`.  Reverts with `TransferFailed` on
     *      failure, which is safer than `.transfer` (avoids 2300 gas stipend issues).
     */
    function _sendETH(address recipient, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed(recipient, amount);
    }

    /**
     * @dev Builds a deterministic keccak256 hash that the AI backend must sign
     *      before approving a mint.
     *
     *      Includes:
     *        • block.chainid  — prevents cross-chain replay (e.g. testnet → mainnet)
     *        • address(this)  — prevents cross-contract replay attacks
     *        • All mint parameters — binds the signature to exact call data
     *
     * @return The raw (pre EIP-191) message hash.
     */
    function _buildMintHash(
        address minter,
        address creator,
        address brand,
        string calldata uri,
        uint256 mintFee,
        uint256 _bowlingSpeed,
        uint256 _uniquenessScore,
        uint256 nonce
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                block.chainid,          // WireFluid chain ID: 92533
                address(this),          // This contract's address
                minter,                 // Who is minting
                creator,                // Creator receiving 70 %
                brand,                  // Brand receiving 15 %
                keccak256(bytes(uri)),  // URI (hashed to handle dynamic length)
                mintFee,                // Required payment
                _bowlingSpeed,          // Sport metadata
                _uniquenessScore,       // AI rarity score
                nonce                   // One-time use nonce
            )
        );
    }

    // ─────────────────────────────────────────────────────────
    //  ERC-165 INTERFACE RESOLUTION
    // ─────────────────────────────────────────────────────────

    /**
     * @inheritdoc ERC165
     * @dev Resolves the diamond-inheritance between ERC721URIStorage and ERC2981.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
