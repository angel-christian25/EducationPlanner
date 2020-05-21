//jshint esversion:6
//jshint esversion:8

const express = require('express');
const app = express();
require('dotenv').config();
app.set("view engine", "ejs");
app.use(express.static('public'));
const bodyParser = require('body-parser');
var multer  = require('multer');
var path = require("path");
var cloudinary = require('cloudinary');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var findOrCreate = require('mongoose-findorcreate');
var flash = require('connect-flash');
const DatauriParser = require('datauri/parser');
//cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_ID,
  api_secret:  process.env.API_SECRET
});

//multer for images
var Storage = multer.memoryStorage();
// var Storage = multer.diskStorage({
//   destination: "public/images/",
//   filename: function (req, file, cb) {
//     let extArray = file.mimetype.split("/");
//     let extension = extArray[extArray.length - 1];
//     cb(null, file.fieldname + '-' + Date.now()+ '.' +extension);
//   }
// });
const uploadFilter = function(req,file, cb) {
    // filter rules here
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|bmp|BMP|jfif|JFIF)$/)) {
       req.fileValidationError = 'Only image files are allowed!,go back and try again';
       return cb(new Error('Only image files are allowed!,go back and try again'), false);
   }
   cb(null, true);
};




var upload = multer({ storage: Storage,fileFilter: uploadFilter}).array('file',3);


const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
//app.use(bodyParser.json());


app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/regDb', {useNewUrlParser: true,useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);
const regSchema = new mongoose.Schema({
  fname : {
    type: String,
    required: true
  },
  lname : {
    type: String,
    required: true
  },
  username : {
    type: String,
    unique: true,
    required: true
  },
  // pswrd :{
  //   type: String,
  //   required: true
  // },
  // cpswrd :{
  //   type: String,
  //   required: true
  // }

});

regSchema.plugin(passportLocalMongoose);
regSchema.plugin(findOrCreate);


var user = new mongoose.model('user', regSchema);

//passport.use(user.createStrategy());
// passport.use(new LocalStrategy(
//   function(username, password, done) {
//     User.findOne({ username: username }, function (err, user) {
//       if (err) { return done(err); }
//       if (!user) { return done(null, false); }
//       if (!user.verifyPassword(password)) { return done(null, false); }
//       return done(null, user);
//     });
//   }
// ));
passport.use(new LocalStrategy(user.authenticate()));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  user.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    user.findOrCreate({ fname: profile.name.givenName,lname:profile.name.familyName,username:profile.emails[0].value }, function (err, user) {
      return cb(err, user);  });
  }
));

const colSchema = new mongoose.Schema({
  cname : {
    type: String,
    required: true
  },
  ccity : {
    type: String,
    required: true
  },
  cutoff : {
    type: Number,
    required: true
  },
  ratings : {
    type: Number,
    required: true
  },
   fees : {
    type: Number,
    required: true
  },
  image: [
      {

          type: String



      }
    ]
   // image :[{
   //    type: String,
   //    required: true
   //  }],
});

var college = mongoose.model('college',colSchema);


app.get('/', (req, res) => {res.render("edu",{neww:''});
  //res.sendFile(__dirname+'/edu.html');

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

app.get('/reg.html', (req, res) => {res.sendFile(__dirname+'/reg.html');

});





app.get('/home.html', (req, res) => {
  if(req.isAuthenticated()){
  res.sendFile(__dirname+'/home.html');}
  else{
    res.render("edu",{neww:''});
  }
});

app.post('/reg.html', (req, res) => {
  const fn = req.body.first_name;
  const ln = req.body.last_name;
  const e = req.body.email;
  const p = req.body.password;
  // const cp = req.body.password_confirmation;

user.register({fname : fn,lname : ln,username : e,}, req.body.password, function(err, user) {
  if (err) {  res.redirect('/reg.html');
console.log(err);}
 else {
  // passport.authenticate("local")(req,res,()=>{
     res.render("edu",{neww:''});
//   });

 }

});
    // Value 'result' is set to false. The user could not be authenticated since the user is not active
  });
// const fn = req.body.first_name;
// const ln = req.body.last_name;
// const e = req.body.email;
// const p = req.body.password;
// const cp = req.body.password_confirmation;
//
// var u1 = new user({ fname : fn,
// lname : ln,
// email : e,
// pswrd : p,
// cpswrd :cp, });
//
// //u1.save();
//
// res.redirect('/');
// });


app.post('/edu.html', (req, res) => {
  if(req.body.username==process.env.ADMIN_UN && req.body.password==process.env.ADMIN_PW ){
    res.sendFile(__dirname+'/admin.html');
  }

  else{
    const user1= new user ({
      username:req.body.username,
      password:req.body.password
    });
    if(!req.body.username){
  res.json({success: false, message: "Username was not given"}) ;
} else {

  if(!req.body.password){
    res.json({success: false, message: "Password was not given"});
  }else{
    passport.authenticate('local', function (err, user1, info) {
       if(err){
         res.json({success: false, message: err}) ;
       } else{
        if (! user1) {
          req.flash('message', 'Username/Password INCORRECT');
          res.render('edu',{neww:req.flash('message')});
        //  res.json({success: false, message: 'username or password incorrect'});
        } else{

          req.login(user1, function(err){
            if(err){
              res.json({success: false, message: err}) ;
            }else{

              res.redirect("/home.html");
            }
          }) ;
        }
       }
    })(req, res);
  }
}
  //   const user1= new user ({
  //     username:req.body.username,
  //     password:req.body.password
  //   });
  //
  // req.login(user1, function(err) {
  //   if (err) { console.log(err); }
  //   else{
  //
  //     passport.authenticate("local")(req,res,()=>{
  //       res.redirect('/home.html');
  //     });
  //    }
  // });
}
});

  //old
  // const logu=req.body.username;
  // const logp=req.body.password;
//   if(logu==process.env.ADMIN_UN && logp==process.env.ADMIN_PW ){
//     res.sendFile(__dirname+'/admin.html');
//   }
//   else{
//   user.findOne({$and:[{email : logu} ,{pswrd : logp}]},function (err, user) {
//   if (err) {console.log(err);}
//   if(!user){
//
// return res.send("INCORRECT DATA,GO BACK");
//
//   }
// else{
//   return res.sendFile(__dirname+'/home.html');
// // return res.redirect('/home.html')
// }
// });
// }
// });


app.post('/home.html', function (req, res) {
  const per= (req.body.ans);
  console.log(per);
//var cdata=college.find({});
//console.log(cdata);


  college.find({cutoff:{$lt: per}},function(err,college){
    if(err){
      console.log(err);
    }
    else{


        res.render("find", {percen: per,list: college});
//res.render("find");,list: college
    }

  }
);

});



app.post('/adminadd',upload, async function(req,res){




  var u2 = new college({ cname : req.body.cname,
  ccity : req.body.ccity,
  cutoff: req.body.cutoff,
  ratings : req.body.ratings,
  fees : req.body.fees,
  //image :{name:req.files.filename}

  });
   for(var i=0;i<3;i++) {

// for(var i=0;i<3;i++){
//   var image = {
//                    name: req.files[i].filename,
//
//                };
//            u2.image.push(image);
// }
//for(var j=0;j<3;j++){
 const parser = new DatauriParser();
 const buffer =req.files[i].buffer;
 parser.format('.png', buffer);
var result= await cloudinary.uploader.upload(parser.content);
var image= result.secure_url;
//var image= result.secure_url;
 u2.image.push(image);


}
 u2.save();
res.sendFile(__dirname+'/admin.html');
// res.redirect('/admin.html');




});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['openid', 'email', 'profile'] }));

  app.get('/auth/google/home',
    passport.authenticate('google', { failureRedirect: '/' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/home.html');
    });

app.get('/logout',(req,res)=>{
  req.logout();
  res.render("edu",{neww:''});

});
