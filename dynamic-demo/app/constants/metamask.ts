import { TypedData } from "viem";

export const METAMASK_DELEGATION = {
  address: "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B",
  type: "EIP7702StatelessDeleGator",
  version: "1",
} as const;

export const METAMASK_SIGNABLE_USER_OP_TYPED_DATA: TypedData = {
  PackedUserOperation: [
    { name: "sender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "initCode", type: "bytes" },
    { name: "callData", type: "bytes" },
    { name: "accountGasLimits", type: "bytes32" },
    { name: "preVerificationGas", type: "uint256" },
    { name: "gasFees", type: "bytes32" },
    { name: "paymasterAndData", type: "bytes" },
    { name: "entryPoint", type: "address" },
  ],
} as const;
