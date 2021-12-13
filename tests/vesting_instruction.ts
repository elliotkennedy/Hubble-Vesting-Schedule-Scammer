import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as serumCmn from "@project-serum/common";
import * as anchor from '@project-serum/anchor';
import { VestingSchedule } from '../target/types/vesting_schedule';
import { TokenInstructions } from "@project-serum/serum";
import { Program } from '@project-serum/anchor';
import { createMint, createTokenAccount, setUpAta, mapAnchorError } from './utils';
import { sleep } from '@project-serum/common';

const program = anchor.workspace.VestingSchedule as Program<VestingSchedule>;

export type InitializeParameterInterface = {
    vestingSchedule: PublicKey,
    vestingData: Keypair,
    mintHbb: PublicKey,
    vestingVaultHbb: PublicKey
};

export async function getInitilizeParameter(provider:anchor.Provider, admin: Keypair) : Promise<InitializeParameterInterface> {

    const vestingSchedule: PublicKey = (
        await serumCmn.createAccountRentExempt(
            provider,
            program.programId,
            program.account.vestingSchedule.size
        )
    ).publicKey;

    const vData = anchor.web3.Keypair.generate();

    const mintHbb = await createMint(provider, provider.wallet.publicKey, 6);
  
    const vestingVaultHbb = await createTokenAccount(provider, mintHbb, admin.publicKey );

    return {
        vestingSchedule,
        vestingData: vData,
        mintHbb,
        vestingVaultHbb
    };
    
}

export async function initialize(
    currentTime : number,
    admin: Keypair,
    vestingSchedule: PublicKey,
    vestingData: Keypair,
    vestingVault: PublicKey,
    hbbMint: PublicKey,
) {
    await program.rpc.initialize(
        new anchor.BN(currentTime), {
        accounts: {
            admin: admin.publicKey,
            vestingData: vestingData.publicKey,
            vestingSchedule: vestingSchedule,
            vestingVault: vestingVault,
            hbbMint: hbbMint,
            tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [admin, vestingData],
    });
}

export async function claim(
    index: number,
    vestingSchedule: PublicKey,
    vestingData: PublicKey,
    claimAccount: Keypair,
    claimUserAta: PublicKey,
    vestingVault: PublicKey,
    vestingVaultAuthority: PublicKey,
    hbbMint: PublicKey,
) {

    await mapAnchorError(program.rpc.claim(
      new anchor.BN(index), {
      accounts: {
        claimingUser: claimAccount.publicKey,
        vestingSchedule: vestingSchedule,
        vestingData: vestingData,
        claimUserHbbAta: claimUserAta,
        vestingVault: vestingVault,
        vestingVaultAuthority: vestingVaultAuthority,
        hbbMint: hbbMint,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [claimAccount]
    }));
}

export async function getUserAta(user:Uint8Array, provider:anchor.Provider, mintHbb: PublicKey) : Promise<PublicKey> {
    const userLiquidator = Keypair.fromSecretKey(user);
    await provider.connection.requestAirdrop(userLiquidator.publicKey, 3 * LAMPORTS_PER_SOL);
    await sleep(500);
    const userAta = await setUpAta(provider, userLiquidator, mintHbb);
    return userAta;
}

export async function addUser(
    unlock_percent: number,
    userPubkey: PublicKey,
    unlockPeriod: number,
    plannedTokens: number,
    admin: Keypair,
    vestingData: PublicKey,
    vestingSchedule: PublicKey,
) {
    await mapAnchorError(program.rpc.addUser(
        new anchor.BN(unlock_percent),
        userPubkey,
        new anchor.BN(unlockPeriod),
        new anchor.BN(plannedTokens), 
        {
            accounts: {
                admin: admin.publicKey,
                vestingData: vestingData,
                vestingSchedule: vestingSchedule,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [admin]
        }
    ));
}

export async function removeUser(
    index: number,
    admin: Keypair,
    vestingData: PublicKey,
    vestingSchedule: PublicKey,
) {
    await program.rpc.removeUser(
        new anchor.BN(index),
        {
            accounts: {
                admin: admin.publicKey,
                vestingData: vestingData,
                vestingSchedule: vestingSchedule,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
            signers: [admin]
        }
    );
}