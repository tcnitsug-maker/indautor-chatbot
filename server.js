const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log('MongoDB conectado'))
  .catch(err=>console.error('Error MongoDB:', err));

app.post('/api/chat', async (req, res) => {
  res.json({ response: "Chatbot funcionando en Render" });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/admin', (req, res) => res.sendFile(__dirname + '/public/admin.html'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Servidor en puerto', PORT));
