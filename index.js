const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;
//middleWare 
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jc89u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const UserCollection = client.db("bistroDB").collection("users"); 
    const MenuCollection = client.db("bistroDB").collection("menu"); 
    const ReviewCollection = client.db("bistroDB").collection("reviews"); 
    const CartCollection = client.db("bistroDB").collection("carts"); 
    


    //user related api
    app.get('/users',async(req,res)=>{
      const result = await UserCollection.find().toArray();
      res.send(result);
    })
    app.post('/users',async(req,res)=>{
      const user = req.body;
      const query = {email:user.email};
      const existingEmail = await UserCollection.findOne(query);
      if(existingEmail){
        return  res.send({message:"user already existed!",insertedId:null})
      }
      const result = await UserCollection.insertOne(user);
      res.send(result);
  })
  app.delete('/users/:id',async(req,res)=>{
    const id = req.params.id;
    const query = {_id:new ObjectId(id)};
    const result = await UserCollection.deleteOne(query);
    res.send(result);
  })
  
  //admin related api
  app.patch('/users/admin/:id', async (req, res) => {
    const id = req.params.id; // Correctly get id from route parameters
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
        $set: {
            role: "admin"
        }
    };
    try {
        const result = await UserCollection.updateOne(filter, updatedDoc);
        res.send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "An error occurred while updating the user role." });
    }
});


    app.get('/menu',async(req,res)=>{
        const result = await MenuCollection.find().toArray();
        res.send(result);
    })
    app.get('/reviews',async(req,res)=>{
        const result = await ReviewCollection.find().toArray();
        res.send(result);
    })
    //cart collection
    app.get('/carts',async(req,res)=>{
      const email = req.query.email;
      const query = {email:email};
      const result = await CartCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/carts',async(req,res)=>{
      const cartItems = req.body;
      const result = await CartCollection.insertOne(cartItems);
      res.send(result);
    })
    app.delete('/carts/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const result  = await CartCollection.deleteOne(query);
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send("Bistro boss coming soon server site!");
})

app.listen(port,()=>{
    console.log(`Bistro boss loaded port ${port}`);
})