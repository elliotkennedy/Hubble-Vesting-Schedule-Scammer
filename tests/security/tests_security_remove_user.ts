import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { mintTo, decimalToU64 } from '../utils';
import { initialize, getInitilizeParameter, removeUser, addUser } from '../vesting_instruction';
import { VestingSchedule } from '../../target/types/vesting_schedule';
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as chai from 'chai'
import { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as serumCmn from "@project-serum/common";
import * as assert from 'assert';

chai.use(chaiAsPromised)

describe('tests_security_remove_user', () => {
    const provider = anchor.Provider.local();
    const program = anchor.workspace.VestingSchedule as Program<VestingSchedule>;
  
    anchor.setProvider(provider);

  it('security_remove_user_with_fake_admin_fails', async () => {
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
    let fakeAdmin = Keypair.generate();

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

    await addUser(
      15,
      user2.publicKey,
      8,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    let getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 2);

    // send fake admin

    await expect(removeUser(1, fakeAdmin, vestingData.publicKey, vestingSchedule)).to.be.rejectedWith("A has_one constraint was violated");
  });


  it('security_remove_user_with_fake_vesting_schedule_fails', async () => {
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
    let user2 = Keypair.generate();

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
      20,
      user1.publicKey,
      12,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    await addUser(
      15,
      user2.publicKey,
      8,
      1_000_000_000,
      admin,
      vestingData.publicKey,
      vestingSchedule,
    );

    let getActiveUsers = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.strictEqual(getActiveUsers.len.toNumber(), 2);

    // send fake schedule

    await expect(removeUser(1, admin, vestingData.publicKey, fakeSchedule)).to.be.rejectedWith("A has_one constraint was violated");
  });
});