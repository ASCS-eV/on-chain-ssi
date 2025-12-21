# did:ethr identifiers for companies

## Desired behaviour of did:ethr identifier for company
1. trust anchor creates company's did:ethr and sets itself as DID controller, usiong setOwner function of company's did:ethr identifier
2. trust anchor as DID controller of company did:ethr sets static pointer to smart contract that enables company admins to change the CID of BFC of company's CRSet
3. other smart contracts can read the trust anchor admins which are stored in events but also on-chain due to delegate role, given by trust anchor calling the setDelegate funciton of company's did:ethr