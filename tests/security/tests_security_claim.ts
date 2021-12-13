import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { mintTo, decimalToU64 } from '../utils';
import { initialize, getInitilizeParameter, claim, getUserAta, addUser } from '../vesting_instruction';
import { VestingSchedule } from '../../target/types/vesting_schedule';
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as chai from 'chai'
import { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as serumCmn from "@project-serum/common";
import * as assert from 'assert';

chai.use(chaiAsPromised)

describe('tests_security_claim', () => {
  const provider = anchor.Provider.local();
  const program = anchor.workspace.VestingSchedule as Program<VestingSchedule>;

  anchor.setProvider(provider);

  it('security_claim_with_fake_userata_fails', async() => {

    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );
    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    let user1 = Keypair.generate();
    let user2 = Keypair.generate();

    await addUser(
      15,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    const getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 1);

    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);
    const userAta2 = await getUserAta(user2.secretKey, provider, mintHbb);
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);


    await expect(claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta2,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    )).to.be.rejectedWith("0x44d");
  });

  it('security_claim_with_fake_vault_authority_fails', async () => {

    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();

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

    const getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 1);

    const fakeData = Keypair.generate().publicKey;
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);
    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);

    await expect(claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      fakeData,
      mintHbb
    )).to.be.rejectedWith("A has_one constraint was violated");
  });

  it('security_claim_with_fake_vault_fails', async () => {

    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();

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

    const getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 1);

    const fakeData = Keypair.generate().publicKey;
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);
    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);

    await expect(claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      fakeData,
      auth.vestingVaultAuthority,
      mintHbb
    )).to.be.rejectedWith("A has_one constraint was violated");
  });

  it('security_claim_from_fake_token_mint_address_fails', async () => {

    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();

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

    const getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 1);

    const fake_schedule = (
      await serumCmn.createAccountRentExempt(
          provider,
          program.programId,
          program.account.vestingSchedule.size
      )
    ).publicKey;

    const fakeData = Keypair.generate().publicKey;
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);
    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);

    await expect(claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      fakeData
    )).to.be.rejectedWith("A has_one constraint was violated");
  });

  it('security_claim_from_fake_vesting_schedule_address_fails', async () => {

    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);
    const { vestingSchedule : fakeSchedule, vestingData : fakeData, mintHbb: fakeHbb, vestingVaultHbb: fakeVaultHbb } = await getInitilizeParameter(provider, admin);
    let user1 = Keypair.generate();

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );

    await initialize(
        currentTime,
        admin,
        fakeSchedule,
        fakeData,
        fakeVaultHbb,
        fakeHbb
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

    const getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 1);

    const auth = await program.account.vestingData.fetch(vestingData.publicKey);
    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);

    await expect(claim(
      0,
      fakeSchedule,
      vestingData.publicKey,
      user1,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    )).to.be.rejectedWith("A has_one constraint was violated");
  });

  it('security_claim_with_fake_useraddress_fails', async() => {

    const publishTime = '2021.8.17';
    const mintTokenAmount = 1_000_000.0;
    const currentTime = new Date(publishTime).getTime() / 1000;
    const userClaimToken = 1_000;
    let admin = Keypair.generate();
    await provider.connection.requestAirdrop(admin.publicKey, 3 * LAMPORTS_PER_SOL);
    await serumCmn.sleep(500);
    const { vestingSchedule, vestingData, mintHbb, vestingVaultHbb } = await getInitilizeParameter(provider, admin);

    await initialize(
      currentTime,
      admin,
      vestingSchedule,
      vestingData,
      vestingVaultHbb,
      mintHbb
    );
    await mintTo(provider, mintHbb, vestingVaultHbb, decimalToU64(mintTokenAmount));

    let user1 = Keypair.generate();
    let user2 = Keypair.generate();

    await addUser(
      15,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    const getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 1);

    const userAta1 = await getUserAta(user1.secretKey, provider, mintHbb);
    const auth = await program.account.vestingData.fetch(vestingData.publicKey);

    await expect(claim(
      0,
      vestingSchedule,
      vestingData.publicKey,
      user2,
      userAta1,
      auth.vestingVault,
      auth.vestingVaultAuthority,
      mintHbb
    )).to.be.rejectedWith("0x44c"); // Users Pubkey does not match
  });
});
