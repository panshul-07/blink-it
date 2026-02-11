// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./YieldStandardsOracle.sol";

contract YieldAccountingSwap {
    struct Processor {
        bool exists;
        bool suspended;
    }

    struct OutputPassport {
        bytes32 parentInputTokenId;
        address processor;
        bytes32 processTypeHash;
        uint256 inputQty;
        uint256 outputQty;
        uint16 claimedYieldBps;
        uint16 actualYieldBps;
        uint8 severity;
        bool auditFlagged;
        uint64 timestamp;
    }

    YieldStandardsOracle public immutable oracle;
    address public owner;

    mapping(address => Processor) public processors;
    mapping(address => mapping(bytes32 => uint8)) public violations;
    mapping(bytes32 => uint256) public inputBalances;
    mapping(bytes32 => OutputPassport) public outputPassports;

    event ProcessorRegistered(address indexed processor);
    event InputMinted(bytes32 indexed inputTokenId, address indexed processor, uint256 quantity);
    event InputBurned(bytes32 indexed inputTokenId, address indexed processor, uint256 quantity);
    event OutputMinted(bytes32 indexed outputTokenId, address indexed processor, uint256 quantity, uint8 severity, bool auditFlagged);
    event SwapProcessed(bytes32 indexed outputTokenId, bytes32 indexed inputTokenId, address indexed processor, uint16 claimedYieldBps, uint16 actualYieldBps);

    error NotOwner();
    error UnknownProcessor();
    error ProcessorSuspended();
    error MissingInputToken();
    error InvalidInputQuantity();
    error YieldAboveMaximum();
    error PersistentViolationsSuspended();

    constructor(address oracleAddress, address owner_) {
        oracle = YieldStandardsOracle(oracleAddress);
        owner = owner_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function registerProcessor(address processor) external onlyOwner {
        processors[processor] = Processor({exists: true, suspended: false});
        emit ProcessorRegistered(processor);
    }

    function mintInputToken(bytes32 inputTokenId, address processor, uint256 quantity) external onlyOwner {
        if (!processors[processor].exists) revert UnknownProcessor();
        inputBalances[inputTokenId] = quantity;
        emit InputMinted(inputTokenId, processor, quantity);
    }

    function processSwap(
        bytes32 inputTokenId,
        string calldata processType,
        uint256 inputQty,
        uint256 claimedOutputQty
    ) external returns (bytes32 outputTokenId, uint256 mintedOutputQty, uint8 severity, bool auditFlagged) {
        Processor storage proc = processors[msg.sender];
        if (!proc.exists) revert UnknownProcessor();
        if (proc.suspended) revert ProcessorSuspended();

        uint256 available = inputBalances[inputTokenId];
        if (available == 0) revert MissingInputToken();
        if (available != inputQty || inputQty == 0) revert InvalidInputQuantity();

        (uint16 minimumBps, uint16 maximumBps) = oracle.getRange(processType);
        uint16 claimedYieldBps = uint16((claimedOutputQty * 10_000) / inputQty);
        if (claimedYieldBps > maximumBps) revert YieldAboveMaximum();

        bytes32 processTypeHash = keccak256(abi.encodePacked(processType));
        mintedOutputQty = claimedOutputQty;
        severity = 0;
        auditFlagged = false;

        if (claimedYieldBps < minimumBps) {
            uint8 count = violations[msg.sender][processTypeHash] + 1;
            violations[msg.sender][processTypeHash] = count;
            if (count == 1) {
                severity = 1;
            } else if (count == 2) {
                severity = 1;
                mintedOutputQty = (claimedOutputQty * 95) / 100;
            } else if (count == 3) {
                severity = 2;
                mintedOutputQty = (claimedOutputQty * 90) / 100;
                auditFlagged = true;
            } else {
                proc.suspended = true;
                revert PersistentViolationsSuspended();
            }
        }

        delete inputBalances[inputTokenId];
        emit InputBurned(inputTokenId, msg.sender, inputQty);

        outputTokenId = keccak256(
            abi.encodePacked(inputTokenId, msg.sender, block.timestamp, block.prevrandao)
        );
        uint16 actualYieldBps = uint16((mintedOutputQty * 10_000) / inputQty);
        outputPassports[outputTokenId] = OutputPassport({
            parentInputTokenId: inputTokenId,
            processor: msg.sender,
            processTypeHash: processTypeHash,
            inputQty: inputQty,
            outputQty: mintedOutputQty,
            claimedYieldBps: claimedYieldBps,
            actualYieldBps: actualYieldBps,
            severity: severity,
            auditFlagged: auditFlagged,
            timestamp: uint64(block.timestamp)
        });

        emit OutputMinted(outputTokenId, msg.sender, mintedOutputQty, severity, auditFlagged);
        emit SwapProcessed(outputTokenId, inputTokenId, msg.sender, claimedYieldBps, actualYieldBps);
    }
}
