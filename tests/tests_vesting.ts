import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { mintTo, decimalToU64, getTokenAccount } from './utils';
import { initialize, getInitilizeParameter, claim, getUserAta, addUser, removeUser } from './vesting_instruction';
import { VestingSchedule } from '../target/types/vesting_schedule';
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as serumCmn from "@project-serum/common";
import * as assert from 'assert';

chai.use(chaiAsPromised)

describe('tests_vesting_schedule', () => {

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.local();
  const program = anchor.workspace.VestingSchedule as Program<VestingSchedule>;

  anchor.setProvider(provider);

  it('initialized_vesting_schedule_success', async () => {
    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const publishTimeAsTimeStamp = new Date(publishTime).getTime() / 1000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);

    await initialize(
      publishTimeAsTimeStamp,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );

    const initializeToken = await getTokenAccount(provider, vestingVaultHbb);
    assert.strictEqual(initializeToken.amount.toNumber(), 0);

    const getVestingData = await program.account.vestingData.fetch(vestingData.publicKey);
    assert.strictEqual(getVestingData.totalIssuedSoFar.toNumber(), 0);

    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    const mintToken = await getTokenAccount(provider, vestingVaultHbb);
    assert.strictEqual(mintToken.amount.toNumber(), 1_000_000_000_000);
  });

  it('add_user_success', async () => {

    // Add 2 Clients
    // Check PendingToken Status Client Number match 2
    // Claim
    // Calc how much will be claimed for 2 Clients
    // Compare token amounts

    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();
    let user2 = Keypair.generate();

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );
    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    await addUser(
      15,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    await addUser(
      20,
      user2.publicKey,
      8,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    const getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 2);

    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);
    const userAta2 = await getUserAta(user2.secretKey, provider, mintHbb);
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );


    let claimTime = new Date().getTime() / 1000;
    let mintTime = new Date(publishTime).getTime() / 1000;

    let delayMinutes = Math.floor((claimTime - mintTime) / 60);

    let calcUserClaimToken1 = Math.floor(0.15 * decimalToU64(userClaimToken) + 0.85 * decimalToU64(userClaimToken) * delayMinutes / (12 * 30.5 * 24 * 60));
    let calcUserClaimToken2 = Math.floor(0.2 * decimalToU64(userClaimToken) + 0.8 * decimalToU64(userClaimToken) * delayMinutes / (8 * 30.5 * 24 * 60));

    let tokenAmountAccount1 = await getTokenAccount(provider, userAta1);
    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), calcUserClaimToken1);

    let tokenAmountAccount2 = await getTokenAccount(provider, userAta2);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), calcUserClaimToken2);
  });

  it('claim_locked_user_get_non_success', async () => {

    // Add 2 clients
    // First User Set Inactive Status
    // Check PendingToken Status Client Number match 1
    // Claim
    // First User Get 0, Second User Get Calculate Amounts
    // First User Set PendingToken Status
    // Check PendingToken Status Client Number match 2
    // Claim
    // First User Get Calculate Amounts, Second User Get 0

    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();
    let user2 = Keypair.generate();

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );
    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    await addUser(
      15,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    await addUser(
      20,
      user2.publicKey,
      8,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    await removeUser(0, admin, vestingData.publicKey, vestingSchedule);
    let getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 1);

    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);
    const userAta2 = await getUserAta(user2.secretKey, provider, mintHbb);
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    let claimTime = new Date().getTime() / 1000;
    let mintTime = new Date(publishTime).getTime() / 1000;

    let delayMinutes = Math.floor((claimTime - mintTime) / 60);

    let calcUserClaimToken1 = 0;
    let calcUserClaimToken2 = Math.floor(0.2 * decimalToU64(userClaimToken) + 0.8 * decimalToU64(userClaimToken) * delayMinutes / (8 * 30.5 * 24 * 60));

    let tokenAmountAccount1 = await getTokenAccount(provider, userAta1);
    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), calcUserClaimToken1);

    let tokenAmountAccount2 = await getTokenAccount(provider, userAta2);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), calcUserClaimToken2);

    await addUser(
      15,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 2);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    claimTime = new Date().getTime() / 1000;
    delayMinutes = Math.floor((claimTime - mintTime) / 60);

    calcUserClaimToken1 = Math.floor(0.15 * decimalToU64(userClaimToken) + 0.85 * decimalToU64(userClaimToken) * delayMinutes / (12 * 30.5 * 24 * 60));
    tokenAmountAccount1 = await getTokenAccount(provider, userAta1);
    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), calcUserClaimToken1);

    tokenAmountAccount2 = await getTokenAccount(provider, userAta2);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), calcUserClaimToken2);
  });

  it('claim_two_times_success', async () => {

    // Add 2 clients
    // Check PendingToken Status Client Number match 2
    // Claim
    // Clients Get Calculated Amount
    // Total Issued So Far = First Client's Claimed Tokens + Second Client's Claimed Tokens
    // Check Mint Token Amount reduced.
    // Claim Again
    // Clients Amount Same with First Claim
    // Total Issued So Far did not change
    // Mint Token Amount did not change

    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();
    let user2 = Keypair.generate();

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );
    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    await addUser(
      15,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    await addUser(
      20,
      user2.publicKey,
      8,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);
    const userAta2 = await getUserAta(user2.secretKey, provider, mintHbb);
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);

    let getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 2);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );


    let claimTime = new Date().getTime() / 1000;
    let mintTime = new Date(publishTime).getTime() / 1000;

    let delayMinutes = Math.floor((claimTime - mintTime) / 60);

    let calcUserClaimToken1 = Math.floor(0.15 * decimalToU64(userClaimToken) + 0.85 * decimalToU64(userClaimToken) * delayMinutes / (12 * 30.5 * 24 * 60));
    let calcUserClaimToken2 = Math.floor(0.2 * decimalToU64(userClaimToken) + 0.8 * decimalToU64(userClaimToken) * delayMinutes / (8 * 30.5 * 24 * 60));

    let tokenAmountAccount1 = await getTokenAccount(provider, userAta1);
    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), calcUserClaimToken1);

    let tokenAmountAccount2 = await getTokenAccount(provider, userAta2);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), calcUserClaimToken2);

    let getTotalIssue = await program.account.vestingData.fetch(vestingData.publicKey);
    assert.strictEqual(getTotalIssue.totalIssuedSoFar.toNumber(), calcUserClaimToken1 + calcUserClaimToken2);

    let tokenAmountVaultAccount = await getTokenAccount(provider, vestingVaultHbb);
    assert.strictEqual(tokenAmountVaultAccount.amount.toNumber(), 1_000_000_000_000 - calcUserClaimToken1 - calcUserClaimToken2);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), calcUserClaimToken1);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), calcUserClaimToken2);
    assert.strictEqual(getTotalIssue.totalIssuedSoFar.toNumber(), calcUserClaimToken1 + calcUserClaimToken2);
    assert.strictEqual(tokenAmountVaultAccount.amount.toNumber(), 1_000_000_000_000 - calcUserClaimToken1 - calcUserClaimToken2);
  });

  it('claim_after_user_period_success', async () => {

    // Add 2 clients
    // Check PendingToken Status Client Number match 2
    // Claim
    // All Clients Get Total Amount
    // Claim Again
    // Clients Amount Same with Total Amount

    const publishTime = '2020.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();
    let user2 = Keypair.generate();

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );
    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    await addUser(
      15,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    await addUser(
      20,
      user2.publicKey,
      8,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);
    const userAta2 = await getUserAta(user2.secretKey, provider, mintHbb);
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);

    let getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 2);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    let tokenAmountAccount1 = await getTokenAccount(provider, userAta1);
    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), 1_000_000_000);

    let tokenAmountAccount2 = await getTokenAccount(provider, userAta2);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), 1_000_000_000);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), 1_000_000_000);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), 1_000_000_000);
  });

  it('claim_before_token_publish_get_non_success', async () => {

    // Add 2 clients
    // Check PendingToken Status Client Number match 2
    // Claim
    // All Clients Get 0 Tokens
    // Claim Again
    // All Clients Also Get 0 Tokens
    const publishTime = '2022.1.11';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();
    let user2 = Keypair.generate();

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );
    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    await addUser(
      15,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    await addUser(
      20,
      user2.publicKey,
      8,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);
    const userAta2 = await getUserAta(user2.secretKey, provider, mintHbb);
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);

    let getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 2);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    let tokenAmountAccount1 = await getTokenAccount(provider, userAta1);
    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), 0);

    let tokenAmountAccount2 = await getTokenAccount(provider, userAta2);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), 0);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), 0);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), 0);
  });

  it('claim_non_vesting_period_success', async () => {

    // Add First client (Vesting Period = 0, Unlock Percent = 100)
    // Check PendingToken Status Client Number match 1
    // Claim
    // Client Get 1000 Tokens
    // Claim Again
    // Client Token Amount Still 1000 Tokens
    // Add Second client (Vesting Period = 0, Unlock Percent = 100)
    // Set Second Client to InActive
    // Claim
    // Second Clients Token Amount 0
    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();
    let user2 = Keypair.generate();

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );
    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    await addUser(
      100,
      user1.publicKey,
      0,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);

    let getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 1);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    let tokenAmountAccount1 = await getTokenAccount(provider, userAta1);
    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), 1_000_000_000);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), 1_000_000_000);

    const userAta2 = await getUserAta(user2.secretKey, provider, mintHbb);
    await addUser(
      100,
      user2.publicKey,
      0,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    await removeUser(1, admin, vestingData.publicKey, vestingSchedule);
    await claim(
      1,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    let tokenAmountAccount2 = await getTokenAccount(provider, userAta2);
    assert.strictEqual(tokenAmountAccount2.amount.toNumber(), 0);
  });

  it('claim_one_second_after_token_publish_success', async () => {

    // Add client
    // Check PendingToken Status Client Number match 1
    // Claim
    // Client Get unlock_period * total_amount Tokens
    // Claim Again
    // Client Token Amount Still Same
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date().getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();
    let user2 = Keypair.generate();

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );
    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    await addUser(
      20,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);

    let getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 1);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    let tokenAmountAccount1 = await getTokenAccount(provider, userAta1);
    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), 1_000_000_000 * 0.2);

    await claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    );

    assert.strictEqual(tokenAmountAccount1.amount.toNumber(), 1_000_000_000 * 0.2);
  });
  
});
