const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    // await client.connect();
    const UserCollection = client.db("bistroDB").collection("users"); 
    const MenuCollection = client.db("bistroDB").collection("menu"); 
    const ReviewCollection = client.db("bistroDB").collection("reviews"); 
    const CartCollection = client.db("bistroDB").collection("carts"); 
    const PaymentsCollection = client.db("bistroDB").collection("payments"); 
    
  //jwt token related
  app.post('/jwt', async (req, res) => {
    const { email } = req.body;   
    if (!email) {
      return res.status(400).send({ message: 'Email is required' });
    } 
    const token = jwt.sign({ email }, process.env.ACESSS_TOKEN_SECRET, { expiresIn: '1h' });
    res.send({ token });
  });
  
 const verifyToken = (req,res,next)=>{
  // console.log('Inside the verifyToken',req.headers.authorization);
  if(!req.headers.authorization){
    return res.status(401).send({message:'Unauthorize Access!'});
  }
  const token = req.headers.authorization.split(' ')[1]; 
  jwt.verify(token,process.env.ACESSS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'Unauthorize Access!'});
    }
    req.decoded = decoded;  
    next();
  }) 
 };
 //use verify admin after verifyToken
 const verifyAdmin =async (req,res,next)=>{
 const email = req.decoded.email;
 const query = {email:email};
 const user = await UserCollection.findOne(query);
 const isAdmin = user?.role ==='admin';
 if(!isAdmin){
  res.status(403).send({message:'Forbidden Access!'});
 }
 next();
 }
 app.get('/users/admin/:email',verifyToken,async(req,res)=>{
  const email = req.params.email;  
  if(email !== req.decoded.email){
    return res.status(403).send({message:'Forbidden  Access'})
  }
  const query = {email:email};
  const user = await UserCollection.findOne(query);
  let admin = false;
  if(user){
    admin = user?.role === 'admin';
  }
  res.send({admin});
 })
    //user related api
    app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
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
  app.delete('/users/:id',verifyAdmin,verifyToken,async(req,res)=>{
    const id = req.params.id;
    const query = {_id:new ObjectId(id)};
    const result = await UserCollection.deleteOne(query);
    res.send(result);
  })
  
  //admin related api
  app.patch('/users/admin/:id',verifyAdmin,verifyToken, async (req, res) => {
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
    app.post('/menu',verifyToken,verifyAdmin,async(req,res)=>{
      const item = req.body;
      const result = await MenuCollection.insertOne(item);
      res.send(result);
    })
    app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id; 
      const query = { _id: new ObjectId(id)}; 
      const result = await MenuCollection.deleteOne(query);  
      res.send(result);
  });
  app.put('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;   
    const filter = { _id: id}; 
    const updateMenuItems = req.body; 
    const updatedDoc = {
      $set: {
        name: updateMenuItems.name,
        category: updateMenuItems.category, 
        price: updateMenuItems.price, 
      }
    };   
      const result = await MenuCollection.updateOne(filter, updatedDoc);  
      res.send(result); 
  });
  
  
  
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

    //payment-intent
    app.post('/create-payment-intent',async(req,res)=>{
      const {price} = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types:['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })  
    app.get('/payments/:email',verifyToken,async(req,res)=>{
      const query = {email:req.params.email};
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message:'Forbidden Access!'});
      }
      const result = await PaymentsCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/payments', async (req, res) => { 
        const payment = req.body;  
        const result = await PaymentsCollection.insertOne(payment);  
        const query = {
          _id: {
            $in: payment.cartIds.map(id => new ObjectId(id)),  
          },
        }; 
        // Delete cart items from CartCollection
        const deleteResult = await CartCollection.deleteMany(query);
        console.log("Deleted items:", deleteResult); 
        res.send({result,deleteResult }); 
    });
    //states for admin and graph and analytic
    app.get('/admin-stats',verifyToken,verifyAdmin,async(req,res)=>{
      const users = await UserCollection.estimatedDocumentCount();
      const menuItems = await MenuCollection.estimatedDocumentCount();
      const orders = await PaymentsCollection.estimatedDocumentCount();
      //this is the not best way
      // const payments = await PaymentsCollection.find().toArray();
      // const revenue = payments.reduce((total,payment)=>total+payment.price,0) 
      const revenue = await PaymentsCollection.aggregate([
        {
          $group:{
            _id:null,
            totalPrice:{$sum:"$price"}
          }
        }
      ]).toArray();
      const totalRevenue = revenue.length > 0 ? revenue[0].totalPrice : 0;
      res.send({
        users,
        menuItems,
        orders,
        totalRevenue,
      })
    })

    //using aggregate pipeline
    app.get('/order-stats',verifyToken,verifyAdmin,async(req,res)=>{
      const result = await PaymentsCollection.aggregate([
        {
          $unwind:"$menuItemIds"
        },
        {
          $lookup:{
            from:"menu",
            localField:"menuItemIds",
            foreignField:"_id",
            as:"menuItems",
          }
        },
        {
          $unwind:"$menuItems"
        },
        {
          $group:{
            _id:"$menuItems.category",
            quantity:{
              $sum: 1
            },
            revenue:{$sum:"$menuItems.price"}
          }
        },
        {
          $project:{
            _id:0,
            category:"$_id",
            totalQuantity:"$quantity",
            totalRevenue:{
              $round: ["$revenue",2]
            }, 
          }
        }
      ]).toArray();
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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