const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wmqrb.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const productCollection = client
      .db("infinityElectronics")
      .collection("products");

    // Auth

    app.post("/login", (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ accessToken });
    });

    // get all data api
    app.get("/products", async (req, res) => {
      const query = {};
      const result = req.query.name;
      let products;
      if (result === "inventory") {
        const cursor = productCollection.find(query);
        products = await cursor.toArray();
      } else {
        const cursor = productCollection.find(query);
        products = await cursor.limit(6).toArray();
      }
      res.send(products);
    });

    // get single data api
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });

    // update quantity api
    app.put("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const data = req.body;
      const updateDoc = {
        $set: {
          quantity: data.quantity,
        },
      };
      const result = await productCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });
    // delete single item api
    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    // post single product api
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    // get single user product api
    app.get("/items", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email === decodedEmail) {
        const query = { email };
        const cursor = productCollection.find(query);
        const products = await cursor.toArray();
        res.send(products);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// root api
app.get("/", (req, res) => {
  res.send("Running Infinity Electronics Server");
});

// listening port
app.listen(port, () => {
  console.log("Listening to port", port);
});
