const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
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
    const storeNotesCollection = client.db("LearnMore").collection("storeNotes");
    const userCollection = client.db("LearnMore").collection("users");
    const paymentCollection = client.db("LearnMore").collection("payment");

    //  jwt api
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares
    const verifyToken = (req, res, next) =>{

    //  token
      if (!req.headers.authorization){
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if (err){
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })

    }

      

    // user API
    app.get('/users',verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
      // console.log(result)
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })


    // user save to the database
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
     
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

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


       // Save added study session
    app.post("/studySession", async (req, res) => {
      const addedSessionData = req.body;
      const result = await sessionCollection.insertOne(addedSessionData);
      res.send(result);
    });

    // All StoreNotes Data
    app.get('/storeNotes', async(req, res) =>{
      const result = await storeNotesCollection.find().toArray();
      res.send(result);
  });

       // Save notes
    app.post("/storeNote", async (req, res) => {
      const createNotesData = req.body;
      const result = await storeNotesCollection.insertOne(createNotesData);
      res.send(result);
      console.log(result)
    });

      // get all notes posted by a user
      app.get("/storeNotes/:email", async (req, res) => {
        const email = req.params.email;
        const query = { email };
        const result = await storeNotesCollection.find(query).toArray();
        res.send(result);
      });
      app.get("/storeNote/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await storeNotesCollection.findOne(query);
        res.send(result);
      });

    // update note
    app.put("/storeNote/:id", async (req, res) => {
      const id = req.params.id;
      const updateNote = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...updateNote,
        },
      };
      const result = await storeNotesCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

     // delete note from db
     app.delete("/storeNote/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await storeNotesCollection.deleteOne(query);
      res.send(result);
    });

    // Search
    app.get("/search", async (req, res) => {
      const search = req.query.search;
      let query = {
        name: { $regex: search, $options: "i" },
      };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

      // payment
      app.post('/create-payment-intent', async(req, res) =>{
        const {price} = req.body;
        const amount = parseInt(price * 100);
        console.log(amount)

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        });

        res.send({
          clientSecret: paymentIntent.client_secret
        })
      })


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