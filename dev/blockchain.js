const sha256 = require('sha256');
const { v4: uuidv4 } = require('uuid');
const currentNodeUrl = process.argv[3];

class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];

    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];
    this.createNewBlock(100, '0', '0');
  }

  createNewBlock(nonce, prevuesBlockHash, hash) {
    const newBlock = {
      index: this.chain.length + 1,
      timeStamp: Date.now(),
      transactions: this.pendingTransactions,
      nonce,
      prevuesBlockHash,
      hash,
    };

    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  createNewTransaction(amount, sender, recipient) {
    const newTransaction = {
      amount,
      sender,
      recipient,
      transactionId: uuidv4().split('_').join(''),
    };

    return newTransaction;
  }

  addTransactionToPendingTransactions(transactionObj) {
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock().index + 1;
  }

  hashBlock(prevuesBlockHash, nonce, currentBlockData) {
    const dataAsString =
      prevuesBlockHash + nonce.tostring() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);
    return hash;
  }

  proofOfWork(prevuesBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(prevuesBlockHash, nonce, currentBlockData);

    while (hash.substring(0, 4) !== '0000') {
      nonce++;
      hash = this.hashBlock(prevuesBlockHash, nonce, currentBlockData);
    }
    return nonce;
  }
}

module.exports = Blockchain;
