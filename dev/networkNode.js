const express = require('express');
const Blockchain = require('./blockchain');
const bodyParser = require('body-parser');
const uuid = require('uuid/v1');

const nodeAdders = uuid().split('_').join('')

const bitcoin = new Blockchain();
const app = express();

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
        transactions : bitcoin.pendingTransactions,
    };
    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, nonce, currentBlockData);
    bitcoin.createNewTransaction(12.5, '00', nodeAdders);

    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

    res.json({
        note:'new block mined successfully.',
        block: newBlock,
    })
});

app.listen(3000, () => {
  console.log('Listening on port 3000...');
});
