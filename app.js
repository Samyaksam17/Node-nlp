const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const expressValidator = require("express-validator");
const session = require("express-session");
const csvtojson = require("csvtojson");
const csvtoJson = require("convert-csv-to-json");
const hbs = require("hbs");
const multer = require("multer");
const fs = require("fs");

// initialize express
var app = express();

app.use(express.static("public"));
// view engine setup
app.set("view engine", "hbs");
app.set("views", "views");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Express Session
app.use(
  session({
    secret: "secret",
    saveUninitialized: true,
    resave: true,
  })
);

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type,enctype,Authorization"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

// Express Validator
app.use(
  expressValidator({
    errorFormatter: function (param, msg, value) {
      var namespace = param.split("."),
        root = namespace.shift(),
        formParam = root;

      while (namespace.length) {
        formParam += "[" + namespace.shift() + "]";
      }
      return {
        param: formParam,
        msg: msg,
        value: value,
      };
    },
  })
);

app.get("/", (req, res) => {
  res.render("homepage");
});

// create a multer instance to handle file uploads
const upload = multer({ dest: "uploads/" });

const { NlpManager } = require("node-nlp");
// Creating new Instance of NlpManager class.
const manager = new NlpManager({ languages: ["en"] });

// define an endpoint to handle file uploads
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // convert the CSV file to JSON
    const jsonArray = await csvtojson().fromFile(req.file.path);

    // write the JSON data to a file
    fs.writeFileSync(
      `./intents/${req.file.originalname}.json`,
      JSON.stringify(jsonArray)
    );
    console.log("File converted to JSON and saved!");
    res.json({ status: true, message: "File Uploaded Successfully!" });
    console.log(jsonArray);
    // res.render("homepage");
  } catch (err) {
    console.error(err);
    res.json({
      status: false,
      message: "an error occured while uploading file",
    });
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    // convert the CSV file to JSON
    const jsonArray = await csvtojson().fromFile(file.path);
    // console.log(jsonArray);

    // write the JSON data to a file
    const filename = file.originalname.replace(".csv", ".json");
    fs.writeFileSync(`./intents/${filename}`, JSON.stringify(jsonArray));

    // console.log(`File converted to JSON and saved as ${filename}!`);

    res.json({ filename: filename });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Something went wrong!" });
  }
});

// define an endpoint to handle model training
app.post("/train", async (req, res) => {
  try {
    // load the training data from the JSON file
    const filename = req.body;
    // const trainingData = require(`./intents/${req.body.filename}.json`);
    const trainingData = require(`./intents/${filename}`);
    console.log(trainingData);

    // add the training data to the model
    trainingData.forEach(({ text, intent }) => {
      manager.addDocument("en", text, intent);
    });

    // train the model
    await manager.train();
    console.log("Model trained!");
    res.status(200).send("Model trained successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while training the model.");
  }
});

// Set Port
app.set("port", 3003);

app.listen(app.get("port"), () => {
  console.log("Server started on port " + app.get("port"));
});
