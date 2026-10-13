const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://felixjardini502_db_user:ashamaina1531@ac-phsxhyo-shard-00-00.khrjtap.mongodb.net:27017,ac-phsxhyo-shard-00-01.khrjtap.mongodb.net:27017,ac-phsxhyo-shard-00-02.khrjtap.mongodb.net:27017/?ssl=true&replicaSet=atlas-i0t3wk-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).then(() => {
  console.log('Connected to MongoDB');
  
  const Chunk = mongoose.model('Chunk', new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    text: { type: String },
    embedding: { type: [Number] },
    metadata: { page: { type: Number }, heading: { type: String }, chunkIndex: { type: Number } },
  }));
  
  // Find all chunks with their company info
  Chunk.find({})
    .limit(20)
    .populate('companyId', 'name')
    .then(chunks => {
      console.log('First 20 chunks:');
      chunks.forEach((c, i) => {
        console.log('  ' + (i+1) + '. companyId: ' + (c.companyId ? c.companyId._id.toString().substring(0, 12) : 'null') + ' - text: ' + (c.text ? c.text.substring(0, 50) + '...' : 'null'));
      });
      
      // Count chunks per company
      return Chunk.aggregate([
        { $group: { _id: '$companyId', count: { $sum: 1 } } }
      ])
      .then(stats => {
        console.log('\nChunks per company:');
        stats.forEach(s => {
          console.log('  Company ' + s._id.toString().substring(0, 12) + ': ' + s.count + ' chunks');
        });
        
        // Find the Acme Shop company
        return mongoose.model('Company', new mongoose.Schema({ name: String })).find({ name: new RegExp('acme', 'i') });
      })
      .then(companies => {
        console.log('\nAcme Shop companies:', companies.length);
        companies.forEach(c => console.log('  - ' + c.name + ': ' + c._id.toString().substring(0, 12)));
        
        // If we have Acme Shop chunks, show them
        if (companies.length > 0) {
          const acmeCompanyId = companies[0]._id;
          return Chunk.find({ companyId: acmeCompanyId }).limit(5);
        }
        return [];
      })
      .then(acmeChunks => {
        console.log('\nAcme Shop chunks:', acmeChunks.length);
        acmeChunks.forEach((c, i) => {
          console.log('  ' + (i+1) + '. text: ' + (c.text ? c.text.substring(0, 60) + '...' : 'null'));
        });
      })
      .then(() => mongoose.disconnect())
      .then(() => console.log('\nDone.'))
      .catch(err => { console.error('Error:', err.message); return mongoose.disconnect(); });
})

.catch(err => {
  console.error('Connection error:', err.message);
  mongoose.disconnect();
});