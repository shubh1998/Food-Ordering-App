const express = require('express');
const session=require('express-session');

const app = express();

const upload = require('express-fileupload');
app.use(upload());
const additem = require('./model/Add_Product');

const User = require('./model/User');

const cart = require('./model/cart');

const Login = require('./model/Admin_Login');
const URL = "mongodb://localhost:27017/FoodOrder";    //For LocalHost
//const URL = "mongodb+srv://shubham:12345@cluster0-hsysq.mongodb.net/test?retryWrites=true&w=majority";
const mongoose = require('mongoose');
mongoose.connect(URL);


const redirectLogin= (request, response, next) => {
    if(!request.session.user)
    {
        response.render('index');
    }
    else{
        next();
    }
};

// caching disabled for every route//////////////////////////////
app.use(function(request, response, next) {
    response.set('Cache-Control', 'no-cache, private, no-store,must-revalidate,max-stale=0, post-check=0, pre-check=0');
    next();
});

app.listen(3000 , () => {
    console.log("Server Started....");
});


app.use(session({
    secret:"1234567",
    cookie: {maxAge:1000*60*8}
}))



//To serve Static Content
app.use(express.static('public'));

//Configure view engine : hbs
// var path = require('path');
// app.set('views' , path.join(__dirname , 'views')); // Give Location
// //console.log(path.join(__dirname , 'views')); //To see path of file view
// app.set('view engine', 'hbs'); // Give Extension

var hbs= require('express-handlebars');
app.engine('hbs' , hbs({
    extname: 'hbs',
    defaultLayout: 'AdminNav',
    layoutsDir: __dirname + '/views/layouts/'
}));
app.set('view engine' , 'hbs');


//Configure body-parser
const bodyparser = require('body-parser');
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended:true
}));


app.get('/checkExistance', (request,response) =>{
    additem.findOne({Pname: request.query.productName},(err, result)=>{
        if(err) throw err;
        else if(result != null)   
            response.send({msg : "<h3><b>Warning : Already Exist</b></h3>"});
        else
            response.send({msg : "Available"});
            //response.render('viewemp',{emps : result});
    });
});


app.get('/searchRecord', (request,response) =>{
    var regex = new RegExp(request.query.name , 'i');

    additem.find({
        $or: [
            {Pname: regex},
            {Pdesc: regex}
        ]
    }).exec(function(err , result){
        if(err) throw err;
        else{
            response.send({searchedData : result});
        }
    })
});


app.get('/' , (request , response) => {
    additem.find((err, result)=>{
        if(err) throw err;
        else    
            response.render('index', {layout: 'CustomerNav.hbs',data : result,Customer:request.session.CustomerName});
    });
});

app.get('/admin-login' , (request , response) => {
    response.render('Admin_login', {layout: 'CustomerNav.hbs'}); //Here Two doubts - (1)Extension, (2)location
});

app.get('/Customer-login' , (request , response) => {
    response.render('Customer_login', {layout: 'CustomerNav.hbs'}); //Here Two doubts - (1)Extension, (2)location
});

app.get('/Customer-Register' , (request , response) => {
    response.render('Customer_Registration', {layout: 'CustomerNav.hbs'}); //Here Two doubts - (1)Extension, (2)location
});

app.get('/Contact' , (request , response) => {
    response.render('ContactUs', {layout: 'CustomerNav.hbs', Customer:request.session.CustomerName});
});

app.get('/About' , (request , response) => {
    response.render('AboutUs', {layout: 'CustomerNav.hbs', Customer:request.session.CustomerName});
});

app.get('/AddProduct' ,(request, response) => {
    response.render('addproduct',{user:request.session.user});
});

app.get('/adminHome',redirectLogin, (request, response) => {
    response.render('AdminHome',{user:request.session.user});
});

app.get('/viewProduct',redirectLogin, (request, response) => {
    additem.find((err, result)=>{
        if(err) throw err;
        else    
            response.render('viewproduct',{data : result, user:request.session.user});
    });
});

app.get('/detailInfo', (request, response) => {
    additem.findOne({_id:request.query.id}, (err, result) => {
        if(err) throw err;
        else
            response.render('viewDetail',{data : result , layout: 'CustomerNav.hbs', Customer:request.session.CustomerName});
    });
});

app.get('/DeleteProduct', redirectLogin, (request,response) => {
    //var id=request.query.id;
    additem.deleteOne({_id:request.query.id}, (err) => {
        if(err) throw err;
        else{
            additem.find((err, result)=>{
                if(err) throw err;
                else    
                    response.render('viewproduct',{data : result , user:request.session.user});
            })
        }
    });
});

app.get('/UpdateProduct',(request,response) => {
    additem.findOne({_id:request.query.id}, (err, result) => {
        if(err) throw err;
        else
            response.render('getUpdateInfo',{data : result , user:request.session.user});
    });
});

app.get('/cartItems', (request, response) => {
    cart.aggregate(
        [
            {
                $match:{
                    userEmail:request.session.CustomerName
                }
            },
            {
                $lookup:
                {
                    from:'additems',
                    localField: 'productId',
                    foreignField: 'Pid',
                    as : "items"
                }
            }
        ],(err, result) => {
            if(err) throw err;
            // console.log(result[0].items);
            // console.log(result);
            // response.json(result);
            else{
                response.render('cartItems',{data:result, Customer:request.session.CustomerName, layout: 'CustomerNav.hbs'})
            }
        }
    )
})



app.post('/cartAction', (request, response) => { 
    if(request.session.CustomerName){
        var newCart = new cart({
            productId: request.query.id,
            userEmail: request.session.CustomerName,
            pQuantity: request.body.count
        });
        //save function return promises
        newCart.save().then(data => {
            additem.find((err, result)=>{
                if(err) throw err;
                else
                    response.render('index', {layout: 'CustomerNav.hbs',data : result,Customer:request.session.CustomerName, msg: 'Cart Updated'});
            });
        });
    }
    else{
        response.render('Customer_login', {layout: 'CustomerNav.hbs'});
    }
});



var fs = require('fs');
var filePath = './public/upload/'; 

app.post('/updateAction', (request,response) => {
    //console.log(request.files);
    if(request.files)
    {
        fs.unlinkSync(filePath + request.body.oldimage)
        var random= Math.random().toString(36).slice(-8);
        var alldata = request.files.pfile;
        var filename = alldata.name;
        var altfname = random + filename;
        alldata.mv('./public/upload/'+altfname, (err) =>{
            if(err) throw err;
        });
        
        additem.findByIdAndUpdate(request.body.id, 
            {Pname:request.body.pname, Pprice:request.body.pprice, Pdesc:request.body.pdesc, Pcategory:request.body.pselect, Pimage:altfname},
            (err) => {
                if(err) throw err;
                else{
                    additem.find((err, result)=>{
                        if(err) throw err;
                        else    
                            response.render('getUpdateInfo',{data : result, user:request.session.user , msg:'Information Updated'});
                    });
                }
            });
    }
    else
    {
        additem.findByIdAndUpdate(request.body.id, 
            {Pname:request.body.pname, Pprice:request.body.pprice, Pdesc:request.body.pdesc, Pcategory:request.body.pselect},
            (err) => {
                if(err) throw err;
                else{
                    additem.find((err, result)=>{
                        if(err) throw err;
                        else    
                            response.render('getUpdateInfo',{data : result, user:request.session.user , msg:'Information Updated'});
                    });
                }
            });
    }
});



app.post('/insertProduct' , (request,response) => {
    if(request.files)
    {
        var random= Math.random().toString(36).slice(-8);
        var alldata = request.files.pfile;
        var filename = alldata.name;
        var altfname = random + filename;
        var newProduct = new additem({
            Pid: random,
            Pname:request.body.pname,
            Pprice:request.body.pprice,
            Pdesc:request.body.pdesc,
            Pcategory:request.body.pselect,
            Pimage: altfname
        });

        alldata.mv('./public/upload/'+altfname, (err) =>{
            if(err) throw err;
            else
            {
                //save function return promises
                newProduct.save().then(data => {
                    response.render('addproduct', {msg : 'Product Added Successfuly', user:request.session.user})
                });
            }
        });
    }
});



app.post('/RegisterUser' , (request,response) => {
    var newUser = new User({
            UserName: request.body.username,
            Password: request.body.userpassword,
            Email: request.body.useremail,
            Contact: request.body.usercontact,
            Address: request.body.userAddress
        });

        //save function return promises
        newUser.save().then(data => {
            response.render('Customer_Registration', {msg : 'Registered Successfuly Now Please Login!', layout: 'CustomerNav.hbs'})
    });
});


app.post('/loginCheck',(request,response)=>{
    var name = request.body.uname;
    Login.findOne({uname:request.body.uname , password:request.body.password},  (err,result)=>{
      if(err) throw err;
      else if(result!=null) 
      {
            request.session.user=name;
            response.render('AdminHome', {user:request.session.user});
      }
     else{
     	response.render('Admin_Login',{msg:"Login Fail", layout: 'CustomerNav.hbs'});
      }
    });
});


app.post('/loginCheckUser',(request,response)=>{
    var name = request.body.useremail;
    User.findOne({Email:request.body.useremail , Password:request.body.userpassword},  (err,result)=>{
      if(err) throw err;
      else if(result!=null) 
      {
        additem.find((err, result)=>{
            if(err) throw err;
            else  
            {
                request.session.CustomerName = name;
                response.render('index', {Customer:request.session.CustomerName, layout: 'CustomerNav.hbs',data : result});
            }
        });
      }
     else{
     	response.render('Customer_login',{msg:"Login Fail", layout: 'CustomerNav.hbs'});
      }
    });
});

/*

// code to create database and collections mannually
app.get('/test',(request,response)=>{
    var emp = new Login({
    	uname: "admin",
    	password: "12345"
    });
    emp.save().then(data => {
    	console.log("data inserted")
    })
});
*/

app.get('/logout',(request,response)=>{
    request.session.destroy();
    additem.find((err, result)=>{
        if(err) throw err;
        else    
            response.render('index', {layout: 'CustomerNav.hbs',data : result}); //Here Two doubts - (1)Extension, (2)location
    });
});


app.use(function(request , response){
    response.status(404);
    response.render('404',{title : '404: Requested Page Not Found'});
});