// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract YieldStandardsOracle {
    struct Range {
        uint16 minimumBps;
        uint16 maximumBps;
        bool exists;
    }

    address public owner;
    mapping(bytes32 => Range) private ranges;

    event RangeUpdated(
        bytes32 indexed processTypeHash,
        string processType,
        uint16 minimumBps,
        uint16 maximumBps,
        string reason
    );

    error NotOwner();
    error InvalidRange();
    error MissingRange();

    constructor(address owner_) {
        owner = owner_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setRange(
        string calldata processType,
        uint16 minimumBps,
        uint16 maximumBps,
        string calldata reason
    ) external onlyOwner {
        if (minimumBps >= maximumBps || maximumBps > 10_000) {
            revert InvalidRange();
        }
        bytes32 key = keccak256(abi.encodePacked(processType));
        ranges[key] = Range({
            minimumBps: minimumBps,
            maximumBps: maximumBps,
            exists: true
        });
        emit RangeUpdated(key, processType, minimumBps, maximumBps, reason);
    }

    function getRange(string calldata processType) external view returns (uint16 minimumBps, uint16 maximumBps) {
        bytes32 key = keccak256(abi.encodePacked(processType));
        Range memory r = ranges[key];
        if (!r.exists) revert MissingRange();
        return (r.minimumBps, r.maximumBps);
    }
}
