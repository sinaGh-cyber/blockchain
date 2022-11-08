const express = require('express');
const Blockchain = require('./blockchain');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const rp = require('request-promise');

const nodeAdders = uuidv4().split('_').join('');

const bitcoin = new Blockchain();
const app = express();
const port = process.argv[2];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/blockchain', (req, res) => {
  res.send(bitcoin);
});

app.post('/transaction', (req, res) => {
  const newTransaction = req.body;
  const blockIndex =
    bitcoin.addTransactionToPendingTransactions(newTransaction);

  res.json({
    note: `Transaction will be added in block number ${blockIndex} .`,
  });
});

app.post('/transaction/broadcast', (req, res) => {
  const { amount, sender, recipient } = req.body;
  const newTransaction = bitcoin.createNewTransaction(
    amount,
    sender,
    recipient
  );
  bitcoin.addTransactionToPendingTransactions(newTransaction);

  const requestPromises = [];
  bitcoin.networkNodes.forEach((networkNodeUrl) => {
    const requestOptions = {
      uri: networkNodeUrl + '/transaction',
      method: 'POST',
      body: newTransaction,
      json: true,
    };

    requestPromises.push(rp(requestOptions));
  });

  Promise.all(requestPromises).then((data) => {
    res.json({ note: 'Transaction created and broadcasted successfully.' });
  });
});

app.get('/mine', (req, res) => {
  const lastBlock = bitcoin.getLastBlock();
  const previousBlockHash = lastBlock.hash;
  const currentBlockData = {
    index: lastBlock.index + 1,
    transactions: bitcoin.pendingTransactions,
  };
  const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = bitcoin.hashBlock(
    previousBlockHash,
    nonce,
    currentBlockData
  );
  const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

  const requestPromises = [];
  bitcoin.networkNodes.forEach((networkNodeUrl) => {
    const requestOptions = {
      uri: networkNodeUrl + '/receive-new-block',
      method: 'POST',
      body: {
        newBlock,
      },
      json: true,
    };

    requestPromises.push(rp(requestOptions));
  });
  Promise.all(requestPromises)
    .then((data) => {
      const requestOptions = {
        uri: bitcoin.currentNodeUrl + '/transaction/broadcast',
        method: 'POST',
        body: {
          amount: 12.5,
          sender: '00',
          recipient: nodeAdders,
        },
        json: true,
      };
      return rp(requestOptions);
    })
    .then((data) => {
      res.json({
        note: 'New block mined and broadcasted successfully.',
        block: newBlock,
      });
    });
});

app.post('/receive-new-block', (req, res) => {
  const newBlock = req.body.newBlock;
  const lastBlock = bitcoin.getLastBlock();
  const correctIndex = lastBlock.index + 1 === newBlock.index;
  const correctHash = lastBlock.hash === newBlock.previousBlockHash;

  if (correctHash && correctIndex) {
    bitcoin.chain.push(newBlock);
    bitcoin.pendingTransactions = [];
    res.json({
      note: 'New block received and accepted.',
      newBlock,
    });
  } else {
    res.json({
      note: 'New block rejected.',
      newBlock,
    });
  }
});

app.post('/register-and-broadcast-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;
  if (bitcoin.networkNodes.indexOf(newNodeUrl) === -1) {
    bitcoin.networkNodes.push(newNodeUrl);
    console.log('Register-node');
  }

  const regNodesPromises = [];
  bitcoin.networkNodes.forEach((networkNodeUrl) => {
    const requestOptions = {
      uri: networkNodeUrl + '/register-node',
      method: 'POST',
      body: { newNodeUrl },
      json: true,
    };
    // console.log(`broadcast-node: ${networkNodeUrl}`);
    regNodesPromises.push(rp(requestOptions));
  });

  Promise.all(regNodesPromises)
    .then((data) => {
      const bulkRegisterOptions = {
        uri: newNodeUrl + '/register-nodes-bulk',
        method: 'POST',
        body: {
          allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl],
        },
        json: true,
      };

      // console.log('bulkRegistration');
      return rp(bulkRegisterOptions);
    })
    .then((data) => {
      res.json({ note: 'New node registered with network successfully.' });
    });
});

app.post('/register-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;
  const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) === -1;
  const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;
  // console.log('register-nodeEndpoint');
  if (nodeNotAlreadyPresent && notCurrentNode) {
    bitcoin.networkNodes.push(newNodeUrl);
  }
  res.json({ note: 'New node registered successfully.' });
});

app.post('/register-nodes-bulk', (req, res) => {
  const allNetworkNodes = req.body.allNetworkNodes;
  allNetworkNodes.forEach((networkNodeUrl) => {
    const nodeNotAlreadyPresent =
      bitcoin.networkNodes.indexOf(networkNodeUrl) === -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) {
      // console.log('bulk-register-nodeEndpoint');
      bitcoin.networkNodes.push(networkNodeUrl);
    }
  });
  res.json({ note: 'Bulk registration successful.' });
});

app.post('/consensus', (req, res) => {
  const requestPromises = [];
  bitcoin.networkNodes.forEach((networkNodeUrl) => {
    const requestOptions = {
      uri: networkNodeUrl + '/blockchain',
      method: 'GET',
      json: true,
    };

    requestPromises.push(rp(requestOptions));
  });
  Promise.all(requestPromises).then((blockchains) => {
    const currentChainLength = bitcoin.chain.length;
    const maxChainLength = currentChainLength;
    const newLongestChain = null;
    const newPendingTransactions = null;

    blockchains.forEach((blockchain) => {
      if (blockchain.chain.length > maxChainLength) {
        maxChainLength = blockchain.chain.length;
        newLongestChain = blockchain.chain;
        newPendingTransactions = blockchain.pendingTransactions;
      }
    });
    if (
      !newLongestChain ||
      (newLongestChain && !bitcoin.chainIsValid(newLongestChain))
    ) {
      res.json({
        note: 'Current chain has not been replaced.',
        chain: bitcoin.chain,
      });
    } else {
      bitcoin.chain = newLongestChain;
      bitcoin.pendingTransactions = newPendingTransactions;
      res.json({
        note: 'This chain has been replaced.',
        chain: bitcoin.chain,
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
