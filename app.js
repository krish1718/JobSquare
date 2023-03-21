const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
var ObjectId = require('mongodb').ObjectId;
const app = express();
const port = 80;

// EXPRESS
app.use('/static', express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(__dirname + '/images')));
app.use(session({
    secret: 'thisisasecretkey',
    resave: false,
    saveUninitialized: false,
    username: '',
    email: '',
    loggedIn: false,
    isAdmin: {
        type: Boolean,
        default: false
    }
}))

// PUG
app.set('view engine', 'pug'); // Set the template engine as pug
app.set('views', path.join(__dirname, 'views')); // Set the views directory (template)

// MONGOOSE
mongoose.set('strictQuery', true);
mongoose.connect('mongodb://localhost/JobsPortal', { useNewUrlParser: true });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("We are connected bro");
})

// SCHEMA
var signupSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    isAdmin: Boolean
})

var applicationSchema = new mongoose.Schema({
    resume: String,
    name: String,
    email: String,
    phone: String,
    company: String,
    linkedin: String,
    twitter: String,
    portfolio: String,
    other: String,
    applicant_email: String,
    applyjob_id: String
});

var jobSchema = new mongoose.Schema({
    company_email: String,
    company_name: String,
    copany_location: String,
    company_website: String,
    company_logo: String,
    job_title: String,
    job_link: String,
    job_type: String,
    job_category: String,
    job_level: String,
    job_location: String,
    job_description: String,
    payment_type: String,
    pay: Number,
    date: String,
    postdate: String,
    expirydate: String
});
jobSchema.index({'$**': 'text'});

//MODEL
var Account = mongoose.model('Account', signupSchema);
var Application = mongoose.model('Application', applicationSchema);
var Job = mongoose.model('Job', jobSchema);

// MULTER
const storage = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, 'images')
    },
    filename: (req, file, cb) =>{
        console.log(file);
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({storage: storage})

// ENDPOINTS
app.get('/index', (req, res) => {
    res.status(200).render('index.pug', {session: req.session});
})

app.get('/applicants', (req, res)=>{
    res.status(200).render('applicants.pug', {session: req.session});
})

app.get('/jobs', (req, res) => {
    let elem;
    // console.log(req.session);
    async function getJobs() {
        if(req.session.loggedIn == true){
            elem = await db.collection('jobs').find().toArray();
            rem = await db.collection('applications').find({applicant_email: req.session.email}).toArray();

            const jid = new Set();
            const ans = new Set();
            fin = [];

            for(i in rem){
                str = ObjectId(rem[i].applyjob_id).toString();
                jid.add(str);
            }

            for(i = elem.length-1; i>=0; i--){
                str = ObjectId(elem[i]._id).toString();
                if(!jid.has(str)){
                    ans.add(i);
                }
            }
            console.log(ans);
            for(i = elem.length-1; i>=0; i--){
                if(ans.has(i)){
                    fin.push(elem[i]);
                }
            }
            res.status(200).render('jobs.pug', {session: req.session, message: "Latest Jobs", details: fin });
        }
        else{
            elem = await db.collection('jobs').find().toArray();
            res.status(200).render('jobs.pug', {session: req.session, message: "Latest Jobs", details: elem });
        }
    };
    getJobs();
})

app.get('/appliedjobs', (req, res) => {
    function findJob(view) {
        let elem;
        let arr = [];
        
        async function getj(e, n){
            elem = await db.collection('jobs').find({ _id: ObjectId(`${e.applyjob_id}`)}).toArray()
            arr.push(elem[0]);

            if(arr.length == n){
                res.status(200).render('jobs.pug', {session: req.session, message: "Your Applied Jobs", details: arr , role: "applied"});
            } 
        }
        for(let i=0; i<view.length; i++){
            getj(view[i], view.length)
        } 
    }
    async function getAppliedJobs() {
        let view;
        let arr = [];
        view = await db.collection('applications').find({applicant_email: req.session.email}).toArray();
        if(view.length == 0){
            res.status(200).render('jobs.pug', {session: req.session, message: "Your Applied Jobs", details: arr });
        }
        else{
            findJob(view);
        }
    };
    getAppliedJobs();
})

app.post('/search', (req, res)=>{
    var elem = req.body.searchText;

    if(elem.length != 0){
        Job.find({$text: { $search: `/${elem}/i`}}, (err, docs)=>{
            if(err)
                res.status(200).render('jobs.pug', {session: req.session, message: "No results found", details: []})
            else
                res.status(200).render('jobs.pug', {session: req.session, message: "Search Results", details: docs})
                
        })
    }
    else{
        let elem;
        async function getJobs() {
            elem = await db.collection('jobs').find().toArray();
            res.status(200).render('jobs.pug', {session: req.session, message: "Latest Jobs", details: elem });
        };
        getJobs();
    } 
})

app.get('/applyjob', (req, res) => {
    if(req.session.loggedIn == true){
        let key = req.query.id;
        let view;
        async function viewApplications(key) {
            view = await db.collection('jobs').find({ "_id": ObjectId(`${key}`) }).toArray();
            res.status(200).render('applyjob.pug', { applications: view });
        }
        viewApplications(key);
    }
    else{
        res.status(200).render('login.pug');
    }
})

app.post('/applyjob', (req, res) => {
    req.body.applyjob_id = req.query.id;
    req.body.applicant_email = req.session.email;
    var data = req.body;
    var applyData = new Application(data)

    console.log(req.body);

    Application.find({email: `${req.session.email}`}, (err, docs)=>{
        if(docs.length>0){
            // console.log(docs.length);
            async function viewApplications(key) {
                view = await db.collection('applications').find({$and: [{ "applyjob_id": ObjectId(`${key}`) }, {"applicant_email": `${req.session.email}`}]}).toArray();

                if(view.length > 0)
                    res.status(200).render('applyjob', {message: "You have already applied for this job", applications: view})
                else{
                    applyData.save().then(() => {
                        res.status(200).render('index.pug', {session: req.session});
                    }).catch(() => {
                        res.status(400).send('Item was not saved to the database')
                    });
                }
            }
            viewApplications(req.query.id);
        }else{
            // console.log(docs.length);
            applyData.save().then(() => {
                res.status(200).render('index.pug', {session: req.session});
            }).catch(() => {
                res.status(400).send('Item was not saved to the database')
            });
        }
    })
})

app.get('/postedjobs', (req, res)=>{
    let elem;
    async function getJobs() {
        elem = await db.collection('jobs').find({company_email: req.session.email}).toArray();
        res.status(200).render('jobs.pug', {session: req.session, message: "Your Posted Jobs", details: elem , role: "posted"});
    };
    getJobs();
})

app.get('/postjob', (req, res) => {
    if(req.session.loggedIn == true){
        res.status(200).render('postjob.pug', {session: req.session});
    }
    else{
        res.status(200).render('login.pug');
    }
})

app.post('/postjob', upload.single('company_logo'), (req, res) => {
    setDate(req)
    var logo = req.file.filename;
    req.body.company_logo = logo;
    var data = req.body;
    console.log(data);
    var jobData = new Job(data)

    jobData.save().then(() => {
        res.status(200).render('index.pug', {session: req.session})
    }).catch(() => {
        res.status(400).send('Item was not saved to the database')
    });
})

app.get('/viewjob', (req, res) => {
    let key = req.query.id;
    let view;
    async function viewJobs(key) {
        view = await db.collection('jobs').find({ _id: ObjectId(`${key}`) }).toArray();
        res.status(200).render('viewjob.pug', {session: req.session, jobdetails: view });
    }
    viewJobs(key);
})

app.get('/signup', (req, res) => {
    res.status(200).render('signup.pug');
})

app.post('/signup', (req, res)=>{
    var mail = req.body.email;

    Account.find({email: mail}, (err, docs)=>{
        if(docs.length>0){
            res.render('signup.pug', {message: "Email already registered"})
        }
        else{
            req.session.username = req.body.name;
            req.session.email = mail;
            req.session.loggedIn = true;
            if(req.body.admin){
                req.session.isAdmin = true;
                req.body.isAdmin = true;
            }
            else{
                req.session.isAdmin = false;
                req.body.isAdmin = false;
            }
            var userData = new Account(req.body)
            userData.save().then(()=>{
                res.status(200).render('index', {session: req.session})
            }).catch(()=>{
                res.status(400).send('Item was not saved to the database')
            });
        }
    });
})

app.get('/signupadmin', (req, res) => {
    res.status(200).render('signupadmin.pug');
})

app.post('/signupadmin', (req, res)=>{
    var mail = req.body.email;

    Account.find({email: mail}, (err, docs)=>{
        if(docs.length>0){
            res.render('signup.pug', {message: "Email already registered"})
        }
        else{
            req.session.username = req.body.name;
            req.session.email = mail;
            req.session.loggedIn = true;
            req.session.isAdmin = true;
            req.body.isAdmin = true;
            var userData = new Account(req.body)
            userData.save().then(()=>{
                res.status(200).render('index', {session: req.session})
            }).catch(()=>{
                res.status(400).send('Item was not saved to the database')
            });
        }
    });
})

app.get('/login', (req, res) => {
    res.status(200).render('login.pug', {message: 'Welcome back! Please enter your details.'});
})

app.post('/login', (req, res)=>{
    var email = req.body.email;
    var password = req.body.password;

    let view;
    async function findAcc(email, password) {
        view = await db.collection('accounts').find({$and: [{email: `${email}`}, {password: `${password}`}]}).toArray();
        if(view.length>0){
            req.session.username = view[0].name;
            req.session.email = email;
            req.session.loggedIn = true;
            if(view[0].isAdmin == true){
                req.session.isAdmin = true;
            }
            res.status(200).render('index', {session: req.session});
        }
        else
            res.status(200).render('login.pug', {message: 'Invalid Credentials!'})
    }
    findAcc(email, password);
})

app.get('/logout', (req, res)=>{
    req.session.username = '';
    req.session.email = '';
    req.session.loggedIn = false;
    req.session.isAdmin = false;
    res.status(200).redirect('index')
})

function setDate(req) {
    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
        "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];

    var d = new Date();
    var num = d.getDate();
    var month = monthNames[d.getMonth()];
    req.body.date = month.substring(0, 3) + " " + num;
    req.body.postdate = month + " " + num;
    
    var today = new Date();
    var tomorrow = new Date();
    tomorrow.setDate(today.getDate()+60);
    num = tomorrow.getDate();
    month = monthNames[tomorrow.getMonth()]
    var diffDays = parseInt((tomorrow - today) / (1000 * 60 * 60 * 24), 10); 

    req.body.expirydate = month + " " + num + " " + `(IN ${diffDays} DAYS)`;
    // req.body.expirydate = month + " " + num;
}

// START THE SERVER
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
0})