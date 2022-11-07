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
  const { amount, sender, recipient } = req.body;

  const blockIndex = bitcoin.createNewTransaction(amount, sender, recipient);
  res.json({
    note: `Transaction will be added in block number ${blockIndex} .`,
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
  bitcoin.createNewTransaction(12.5, '00', nodeAdders);

  const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

  res.json({
    note: 'New block mined successfully.',
    block: newBlock,
  });
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
    
  }res.json({ note: 'New node registered successfully.' });
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

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
