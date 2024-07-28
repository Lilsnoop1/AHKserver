import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import {GridFsStorage} from "multer-gridfs-storage";
import Grid from "gridfs-stream";
import crypto from "crypto"
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import methodoverride from "method-override";
import connectMongoDBSession from 'connect-mongodb-session';
import { Contacts, Employee,User } from "./model.js";
import mongoose from "mongoose";
import yazl from "yazl"
import cors from "cors"
import "dotenv/config"
import getData from "./esalabscraper.js";


const MongoDBStore = connectMongoDBSession(session);
const app = express();
const corsOptions = {
  origin: ['https://ahkwebsite.vercel.app','http://localhost:3001'],
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};

app.use(cors(corsOptions));
const saltingRounds = 10;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine',ejs);
app.use(methodoverride('_method')); 

var conn = mongoose.createConnection("mongodb+srv://ammar:ammar@cluster0.vuzjvhx.mongodb.net/promanagerDB");
mongoose.connect("mongodb+srv://ammar:ammar@cluster0.vuzjvhx.mongodb.net/promanagerDB");

const store = new MongoDBStore({
  uri: 'mongodb+srv://ammar:ammar@cluster0.vuzjvhx.mongodb.net/promanagerDB',
  collection: 'mySessions'
}, function(error) {
  if (error) {
    console.log(error);
  }
});

// Catch errors
store.on('error', function(error) {
  console.log(error);
});


app.set("trust proxy", true);

app.use(session({
  secret: "TopSecretWord",
  resave: false,
  proxy:true,
  saveUninitialized: true,
  store: store,
  name:"AHKWebsite",
  cookie: {
    httpOnly:false,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: true, // Use secure cookies in production (requires HTTPS)
    sameSite: 'none' // Use SameSite=None in production for cross-site requests
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://ahkwebsite.vercel.app"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Credentials", true); // allows cookie to be sent
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, HEAD, DELETE"); // you must specify the methods used with credentials. "*" will not work. 
  next();
});


var gfs;
conn.once('open', function () {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
  })


var storage = new GridFsStorage({
    url: 'mongodb+srv://ammar:ammar@cluster0.vuzjvhx.mongodb.net/promanagerDB',
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          console.log("mrnumber:", req.body.mrnumber);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads',
            metadata: req.body.mrnumber
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });


app.post("/upload",upload.array("reports",10),(req,res)=>{
  res.json({"isAuth":true,"success":"Authorized and Sent"});
})


app.get("/esalabData",async (req,res)=>{
  var object= await getData("https://dressalab.com/");
  res.send(object);
})
 
// app.get("/files",async (req,res)=>{
//   if(req.isAuthenticated()){
//     try {
//       let files = await gfs.files.find().toArray();
//       res.json({files})
//   } catch (err) {
//       res.json({err})
//   }
//   }else{
//     res.redirect("/login");
//   }
// })

// app.get("/login", (req,res)=>{
//   res.render("login.ejs");
// })

// app.get("/register"+process.env.UNIQUE_ID, (req,res)=>{
//   res.render("register.ejs");
// })

app.post("/file",async (req,res)=>{
  const {mrnumber} = req.body;
  console.log(mrnumber);
    try{
      let specFile = await gfs.files.find({metadata:mrnumber}).toArray();
      if (specFile && specFile.length > 0) {
        const bucket = new mongoose.mongo.GridFSBucket(conn, { bucketName: 'uploads' });

        // Set the response headers for the zip file
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=files.zip');

        // Create a zip file
        const zipfile = new yazl.ZipFile();

        // Pipe the zip file to the response
        zipfile.outputStream.pipe(res).on('error', (err) => {
          console.error('Stream error:', err);
          res.status(500).json({"err":"An Error Ocurred"});
        });

        // Append files to the zip
        for (let i = 0; i < specFile.length; i++) {
          const readStream = bucket.openDownloadStream(specFile[i]._id);
          zipfile.addReadStream(readStream, `report${i}.png`);
        }

        // Finalize the zip file
        zipfile.end();
          // readstreamtwo.pipe(res);
          // function streamToString (stream) {
          //     const chunks = [];
          //     return new Promise((resolve, reject) => {
          //       stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          //       stream.on('error', (err) => reject(err));
          //       stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          //     })
          //   }      
      }
  }catch(error){
    res.json({"err":"An Error Occurred"});
  }
})


app.post("/downloadsingle/:index", async (req, res) => {
  const { mrnumber } = req.body;
  try {
      const specFile = await gfs.files.find({ metadata: mrnumber }).toArray();
      if (specFile.length > 0) {
          const bucket = new mongoose.mongo.GridFSBucket(conn, { bucketName: 'uploads' });
          const fileToDownload = specFile[req.params.index];
          
          if (fileToDownload) {
              const downit = bucket.openDownloadStream(fileToDownload._id);
              res.setHeader('Content-Type', fileToDownload.contentType); // Set content type
              downit.pipe(res);
          } else {
              res.status(404).json({ "err": "File not found"});
          }
      } else {
          res.status(404).json({ "err": "File metadata not found" });
      }
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ "err": "An Error Occurred" });
  }
});

app.post("/getfileCount",async(req,res)=>{
  const {mrnumber} = req.body;
  try{
    const files = await gfs.files.find({metadata:mrnumber}).toArray();
    if(files.length>0){
      console.log(files.length);
      res.json({"success":"Found Files","FileCount":files.length});
    }else{
      res.json({"Error":"No Files Found","failure":"No Files Found"});
    }
  }catch(err){
    res.json({"Error":err.message});
  }
})




app.get("/getsession", (req, res) => {
  try {
    if (req.session.passport && req.session.passport.user) {
      res.json({ "isAuth": true, "user": req.session.passport.user,"role":req.user.role});
      console.log(req.user.role);
    } else {
      res.json({ "isAuth": false });
      console.log("null");
    }
  } catch (error) {
    console.error("Error while checking session:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/",(req,res)=>{
  res.send("Server Running");
})
app.post("/getSinglemrnumber",async (req,res)=>{
  const {email,name,mobileNumber} = req.body;
  if(req.isAuthenticated()){
    try{
      const found = await User.findOne({email:email,name:name,mobileNumber:mobileNumber});
      if(found){
        res.json(found);
      }else{
        res.json({"err":"User Not Found","failure":"User Not Found"});
      }
    }catch(err){
      res.json({"err":err.message,"failure":"An Error Ocurred"});
    }
  }else{
    res.json({"isAuth":false});
  }
})
app.get("/getAllmrnumber",async (req,res)=>{
  if(req.isAuthenticated()){
    try{
      const found = await User.find({});
      if(found!=null){
        res.send(found);
      }else{
        res.json({"err":"User Not Found"});
      }
    }catch(err){
      res.json({"err":err.message});
    }
  }else{
    res.json({"isAuth":false});
  }
})




// app.get("/employeefileupload",(req,res)=>{
//   if(req.isAuthenticated()){
//     res.json({"isAuth":true});
//   }else{
//     res.json({"isAuth":false});
//   }
// })


app.get("/getSlip",(req,res,next)=>{
  const stream = res.writeHead(200,{
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment;filename=invoice.pdf'
  });
  

})


app.post("/register", async (req, res) => {
  if(req.isAuthenticated()){
    const email = req.body.email;
  const password = req.body.password;
  const role = req.body.role;
  const name = req.body.name;

  try{
    const check = await Employee.findOne({email:email});
    if(check != null){
      res.json({"failure":"User Already Exists, Try logging in."});
    }else{
      try{
        bcrypt.hash(password,saltingRounds,async (err,hash)=>{
          if(err){
            res.json({"err":"Error Hashing the password","failure":"Server Error"});
          }
          try{
            const newUser = await Employee.create({email:email,password:hash,role:role,name:name});
            if(newUser){
              res.json({"success":"Registered Successfully"})
            }else{
              res.json({"failure":"Error Occurred While Registering"});
            }
          }catch(err){
            res.json({"failure":"Error Occurred While Registering"});
          }
          // req.login(newUser,(err)=>{
          //   if(err){
          //     res.json({"failure":"Error Logging in, Please Retry","isAuth":false});
          //   }else{
          //     res.json({"isAuth":true,"success":"Successful"});
          //   }
          // });
        })
      }catch(error){
        res.json({"err":"Error Creating User","failure":"Error Occurred While Registering"});
      }
    }
  }catch(error){
    res.json({"err":"Error Creating User","failure":"Error Occurred While Registering"});
  }
  }else{
    res.json({"isAuth":false,"failure":"Error Occurred While Registering"});
  }
});

function generateRandomInt32() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(4, (err, buf) => {
      if (err) {
        return reject(err);
      }
      const hex = buf.toString('hex');
      const myInt32 = parseInt(hex, 16);
      resolve(myInt32);
    });
  });
}
async function handleRequest(req, res) {
    try {
      // Generate random 32-bit integer
      const val = await generateRandomInt32();
      console.log(val);  // Now you can use val here

      // Extract data from request body
      const { email, name, age, cnic, gender, dob, mobileNumber, tests, testPrices, discount, received, infotest } = req.body;

      // Validate required fields
      if (!name || !email || !age || !mobileNumber) {
        return res.status(200).json({ "error": "Missing required fields: name, email, age, or mobileNumber" });
      }

      // Check if infotest is provided and not empty
      if (infotest) {
        // Update existing user with infotest
        const updatedUser = await User.findOneAndUpdate(
          { mobileNumber: mobileNumber,email:email },
          { $set: { infotest: infotest } },
          { new: true }  // Return the updated document
        );
        
        if (updatedUser) {
          console.log(updatedUser);
          return res.json({ "success": "User Updated", "isAuth": true, "mrnumber": val });
        } else {
          try {
            const createUser = await User.create({
              email: email,
              name: name,
              age: age,
              cnic: cnic,
              gender: gender,
              dob: dob,
              mobileNumber: mobileNumber,
              mrnumber: val,
              received: received,
              tests: tests,
              testPrices: testPrices,
              discount: discount,
              infotest:infotest
            });
            console.log(createUser);
            if(createUser){
              return res.json({ "success": "User Created", "isAuth": true, "mrnumber": val });
            }else{
              return res.json({"failure": "User Not Created", "isAuth": true, "mrnumber": val });
            }
          } catch (err) {
            return res.status(500).json({ "err": err.message });
          }
        }
      } else {
        if(req.isAuthenticated()){
            // Create new user if infotest is not provided or empty
          const existingUser = await User.findOne({ mobileNumber: mobileNumber,email:email });

          if (!existingUser) {

            try {
              const createUser = await User.create({
                email: email,
                name: name,
                age: age,
                cnic: cnic,
                gender: gender,
                dob: dob,
                mobileNumber: mobileNumber,
                mrnumber: val,
                received: received,
                tests: tests,
                testPrices: testPrices,
                discount: discount
              });
              console.log(createUser);
              if(createUser){
                return res.json({ "Success": "User Created", "isAuth": true, "mrnumber": val });
              }else{
                return res.json({ "failure": "User Not Created", "isAuth": true, "mrnumber": val });
              }
            } catch (err) {
              return res.status(500).json({ "err": err.message,"failure":"An Error Ocurred"});
            }
          } else {
            const newupdatedUser = await User.findOneAndUpdate(
              { mobileNumber: mobileNumber,email:email },
              { $set: {cnic:cnic,gender:gender,dob:dob,received:received,tests:tests,testPrices:testPrices,discount:discount} },
              { new: true }  // Return the updated document
            );
            if(newupdatedUser){
              console.log("woooo");
              return res.json({ "success": "User Updated", "isAuth": true});
            }else{
              return res.json({ "failure": "User Not Updated", "isAuth": true});
            }
        }
        }else {
          return res.json({"isAuth": false,"failure":"Not Authenticated" });
        }
      }
    } catch (err) {
      console.log(err.message);
      return res.status(500).json({ "err": err.message,"failure":"An Error Ocurred"});
    }
}


app.post('/logUser',handleRequest);


app.post("/contactinfo",async (req,res)=>{
  const {email,fname,lname,message} = req.body;
  try{
    const postContact = await Contacts.create({email:email,fname:fname,lname:lname,message:message});
    console.log(postContact);
    if(postContact){
      res.status(200).json({"success":"Contact Form Submitted"});
    }else{
      res.status(200).json({"failure":"Contact Form Not Submitted"});
    }
  }catch(err){
    res.status(400).json({"err":"An error occurred"});
  }
})


app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.json({"isAuth":false,"failure":"Couldn't Log In"});
    if (!user) return res.status(401).json({ "isAuth": false ,"failure":"Couldn't Log In"});
    
    req.logIn(user, (err) => {
      if (err) return res.json({"isAuth":false,"failure":"Couldn't Log In"})
      console.log(user);
      return res.json({"isAuth":true,"role":user.role,"success":"Logged In, Redirecting"});
    });
  })(req, res, next);
});

app.post("/logout",(req,res)=>{
  req.logout((err)=>{
    if(err){
      res.json({"err":"Error Loggin in"});
    }else{
      res.json({"success":"logged out"});
    }
  })
})

passport.use(new Strategy({usernameField:"username",passwordField:"password"},async function verify(username,password,cb){
  
  try{
    const checker = await Employee.findOne({email:username});
    bcrypt.compare(password,checker.password,async (err,result)=>{
      if(err){
        return cb(err);
      }else{
        if(result==true){
          return cb(null,checker);
        }else{
          return cb(null,false);
        }
      }
    })
  }catch(error){
    return cb("User Doesn't Exist",false);
  }
}))


passport.serializeUser((user, cb) => {
  cb(null, user._id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const user = await Employee.findById(id);
    cb(null, user);
  } catch (error) {
    cb(error);
  }
});



app.listen(3000,(req,res)=>{
    console.log("Listening On Port 3000");
})