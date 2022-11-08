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

  chainIsValid(blockchain) {
    let validChain = true;

    for (let i = 1; i < blockchain.length; i++) {
      const currentBlock = blockchain[i];
      const prevBlock = blockchain[i - 1];
      const blockHash = this.hashBlock(prevBlock.hash, currentBlock.nonce, {
        transactions: currentBlock.transactions,
        index: currentBlock.index,
      });
      if (blockHash.substring(0, 4) !== '0000') {
        validChain = false;
      }
      if (currentBlock.prevuesBlockHash !== prevBlock.hash) {
        validChain = false;
      }
    }
    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock.nonce === 100;
    const correctPreviousBlockHash = genesisBlock.prevuesBlockHash === '0';
    const correctHash = genesisBlock.hash === '0';
    const correctTransactions = genesisBlock.transaction.length === 0;

    if (
      !correctNonce ||
      !correctPreviousBlockHash ||
      !correctHash ||
      !correctTransactions
    ) {
      validChain = false;
    }
    return validChain;
  }

  getBlock(blockHash) {
    let correctBlock = null;
    this.chain.forEach((block) => {
      if (block.hash === blockHash) correctBlock = block;
    });
    return correctBlock;
  }

  getTransaction(transactionId) {
    let correctTransaction = null;
    let correctBlock = null;
    this.chain.forEach((block) => {
      block.transactions.forEach((transaction) => {
        if (transaction.transactionId === transactionId) {
          correctTransaction = transaction;
          correctBlock = block;
        }
      });
    });
    return { transaction: correctTransaction, block: correctBlock };
  }

  getAddressData(address) {
    const addressTransactions = [];
    this.chain.forEach((block) => {
      block.forEach((transaction) => {
        if (
          transaction.sender === address ||
          transaction.recipient === address
        ) {
          addressTransactions.push(transaction);
        }
      });
    });

    let balance = 0;
    addressTransactions.forEach((transaction) => {
      if (transaction.recipient === address) balance += transaction.amount;
      else if (transaction.sender === address) balance -= transaction.amount;
    });
    return {
      addressTransactions,
      addressBalance: balance,
    };
  }
}

module.exports = Blockchain;
