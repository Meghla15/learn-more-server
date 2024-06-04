const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(
    cors({
      origin: [
        "http://localhost:5173", "http://localhost:5174",  ],
      credentials: true,
    }) 
  );
  app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wcqculy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
   

    const sessionCollection = client.db("LearnMore").collection("studySession");
    const paymentCollection = client.db("LearnMore").collection("payment");

    // studySession
    app.get('/studySessions', async(req, res) =>{
        const result = await sessionCollection.find().toArray();
        res.send(result);
    });

     // single data
     app.get("/studySession/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await sessionCollection.findOne(query);
        res.send(result);
      });
      app.post("/payment", async (req, res) => {
        const paymentData = req.body;
        const result = await paymentCollection.insertOne(paymentData);
        res.send(result);
      });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Learn more server is running')
})

app.listen(port, () => {
    console.log(`Learn more server is sitting on port ${port}`);
})