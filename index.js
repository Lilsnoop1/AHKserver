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
import { Employee,User } from "./model.js";
import mongoose from "mongoose";
import yazl from "yazl"
import cors from "cors"
import "dotenv/config"
import getData from "./esalabscraper.js";


const MongoDBStore = connectMongoDBSession(session);
const app = express();
const corsOptions = {
  origin: ['https://ahkwebsite.vercel.app','http://localhost:3006'],
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



app.use(session({
  secret: "TopSecretWord",
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Use SameSite=None in production for cross-site requests
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  req.session.cookie.secure = true;
  res.header('Access-Control-Allow-Origin', "http://localhost:3006");
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
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
  res.json({"isAuth":true});
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

app.get("/getsession", (req, res) => {
  try {
    if (req.session.passport && req.session.passport.user) {
      res.json({ "isAuth": true, "user": req.session.passport.user });
      console.log(req.session.passport.user);
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
        res.json({"err":"User Not Found"});
      }
    }catch(err){
      res.json({"err":err.message});
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
  if(req.isAuthenticated()){const email = req.body.username;
  const password = req.body.password;

  try{
    const check = await Employee.findOne({email:email});
    if(check != null){
      res.send("User Already Exists, Try logging in.");
    }else{
      try{
        bcrypt.hash(password,saltingRounds,async (err,hash)=>{
          if(err){
            res.json({"err":"Error Hashing the password"});
          }
          const newUser = await Employee.create({email:email,password:hash,role:"Employee"});
          req.login(newUser,(err)=>{
            if(err){
              res.json({"err":"Error Logging in, Please Retry","isAuth":false});
            }else{
              res.json({"isAuth":true});
            }
          });
        })
      }catch(error){
        res.json({"err":"Error Creating User"});
      }
    }
  }catch(error){
    res.json({"err":"Error Creating User"});
  }}else{
    res.json({"isAuth":false});
  }
});

app.post('/logUser',async (req,res)=>{
  if(req.isAuthenticated()){
    var uniqueMrNumber = crypto.randomBytes(20);
    const {email,name,mobileNumber} = req.body;
    try{
      const createUser = await User.create({email:email,name:name,mobileNumber:mobileNumber,mrnumber:uniqueMrNumber.toString('hex')});
      if(createUser!=null){
        res.json({"Success":"User Created","isAuth":true,"mrnumber":uniqueMrNumber});
      }
    }catch(err){
      res.json({"err":"User not created"});
    }
  }else{
    res.json({"isAuth":false});
  }
})


app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ "isAuth": false });
    
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({"isAuth":true});
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