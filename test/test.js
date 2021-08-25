const { expect } = require("chai");
const { ethers } = require("hardhat");
const rocksAbi=require('./rocksAbi.json')

const emblemVault = "0x2992Cd20c6AB9d46a90ccD31A6dF3477daA0b7C7"
const etherRockContract = "0x41f28833Be34e6EDe3c58D1f597bef429861c4E2";
const rockNumber = 72;
const fractionalVaultAddress = "0xDC98c5543F3004DEBfaad8966ec403093D0aa4A8"
const emblemVaultNftContractAddress = "0x82C7a8f707110f5FBb16184A5933E9F78a34c6ab";
const rockEmblemId = 8681851;

describe("RockEscrow", function () {
  it("works", async function () {
    this.timeout(50000);
    const [accountWithEth] = await ethers.getSigners();
    const RockEscrow = await hre.ethers.getContractFactory("RockEscrow");
    const escrow = await RockEscrow.deploy();
    await escrow.deployed();

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [emblemVault],
    });
    const sisyphus = await ethers.provider.getSigner(
      emblemVault
    );

    const etherRock = new ethers.Contract(
      etherRockContract,
      rocksAbi,
      sisyphus
    )

    expect((await etherRock.rocks(rockNumber)).owner).to.equal(sisyphus._address, "rock owned by sisyphus"); 

    await accountWithEth.sendTransaction({
      to: sisyphus._address,
      value: ethers.utils.parseEther("1.0")
    }); // Send ETH to the sisyphus so he can transfer the rock

    await etherRock.giftRock(rockNumber, escrow.address)

    expect((await etherRock.rocks(rockNumber)).owner).to.equal(escrow.address, "rock owned by escrow");

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fractionalVaultAddress],
    });
    const fractionalVault = await ethers.provider.getSigner(
      fractionalVaultAddress
    );
    await accountWithEth.sendTransaction({
      to: fractionalVault._address,
      value: ethers.utils.parseEther("1.0")
    }); // Send ETH to the vault so it can transfer the nft

    const emblemVaultNftContract = new ethers.Contract(
      emblemVaultNftContractAddress,
      [
        "function transferFrom(address _from, address _to, uint256 _tokenId) external payable",
        "function setApprovalForAll(address _operator, bool _approved) external"
      ],
      fractionalVault
    )

    await emblemVaultNftContract.connect(accountWithEth).setApprovalForAll(escrow.address, true);

    await expect(
      escrow.withdrawRock()
    ).to.be.revertedWith("003004", "Can't withdraw the coins because we don't own the ERC721")

    await emblemVaultNftContract.connect(fractionalVault).transferFrom(fractionalVault._address, accountWithEth.address, rockEmblemId) // Send ERC721 to us

    await escrow.withdrawRock();

    expect((await etherRock.rocks(rockNumber)).owner).to.equal(accountWithEth.address, "rock owned by us");

    await expect(
      escrow.withdrawRock()
    ).to.be.revertedWith('003007', "Can't withdraw anymore")
  });
});


[
  'function giftRock(uint rockNumber, address receiver) external',
  'function rocks(uint id) view external returns (owner address, currentlyForSale bool, price uint256, timesSold uint256)'
];